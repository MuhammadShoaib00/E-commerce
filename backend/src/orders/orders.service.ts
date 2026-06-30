import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Cart, CartDocument } from '../cart/schemas/cart.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { OrderStatus, VALID_STATUS_TRANSITIONS } from '../common/enums/order-status.enum';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly paymentsService: PaymentsService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto): Promise<OrderDocument> {
    // 1. Load cart
    const cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    if (!cart || !cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    // 2. Re-fetch all products server-side (never trust client prices)
    const productIds = cart.items.map((i) => i.productId);
    const products = await this.productModel
      .find({ _id: { $in: productIds } })
      .lean()
      .exec();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // 3. Validate all stock before touching anything
    for (const item of cart.items) {
      const product = productMap.get(item.productId.toString());
      if (!product) {
        throw new NotFoundException(`Product not found`);
      }
      if (product.stockQuantity < item.quantity) {
        throw new ConflictException(
          `Insufficient stock for "${product.name}": only ${product.stockQuantity} available`,
        );
      }
    }

    // 4. Snapshot item details + compute total server-side (never trust client)
    const orderItems = cart.items.map((item) => {
      const p = productMap.get(item.productId.toString())!;
      return {
        productId: p._id,
        name: p.name,
        price: p.price,
        quantity: item.quantity,
      };
    });
    const totalAmount = orderItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );

    // 5. Verify payment BEFORE touching stock. In Stripe mode this checks the
    //    PaymentIntent succeeded and its amount matches this order's total; in
    //    mock mode it always succeeds. Throws otherwise, so no stock is moved.
    const paymentRef = await this.paymentsService.verifyPayment(
      dto.paymentIntentId,
      totalAmount,
      userId,
    );

    // 6. Reserve stock (conditional atomic decrement) and create the order. If
    //    anything fails AFTER payment, roll the stock back AND refund the charge,
    //    so we never keep money for an order that wasn't created.
    const decremented: Array<{ id: string; qty: number }> = [];
    let order: OrderDocument;
    try {
      for (const item of cart.items) {
        const product = productMap.get(item.productId.toString())!;
        const result = await this.productModel.updateOne(
          { _id: product._id, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } },
        );
        if (result.matchedCount === 0) {
          throw new ConflictException(
            `"${product.name}" is no longer available in the requested quantity`,
          );
        }
        decremented.push({ id: product._id.toString(), qty: item.quantity });
      }

      order = await this.orderModel.create({
        userId: new Types.ObjectId(userId),
        items: orderItems,
        totalAmount,
        status: OrderStatus.PENDING,
        paymentRef,
        shippingAddress: {
          street: dto.street,
          city: dto.city,
          country: dto.country,
        },
      });
    } catch (err) {
      // Roll back any stock we decremented.
      if (decremented.length > 0) {
        await Promise.all(
          decremented.map(({ id, qty }) =>
            this.productModel.updateOne(
              { _id: new Types.ObjectId(id) },
              { $inc: { stockQuantity: qty } },
            ),
          ),
        );
      }
      // Refund the charge (no-op in mock mode) so money isn't kept without an order.
      await this.paymentsService.refundPayment(paymentRef);
      throw err;
    }

    // 7. Clear the cart — best-effort, so a failed delete can't undo a valid order.
    await this.cartModel
      .deleteOne({ userId: new Types.ObjectId(userId) })
      .catch(() => undefined);

    return order;
  }

  async findAllForUser(userId: string): Promise<any[]> {
    return this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findOneForUser(orderId: string, userId: string): Promise<any> {
    const order = await this.orderModel
      .findOne({ _id: orderId, userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAll(filters?: { status?: string }): Promise<any[]> {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    return this.orderModel
      .find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async updateStatus(orderId: string, newStatus: OrderStatus): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');

    const allowed = VALID_STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(newStatus)) {
      throw new ConflictException(
        `Cannot transition from "${order.status}" to "${newStatus}"`,
      );
    }

    order.status = newStatus;
    return order.save();
  }

  getModel(): Model<OrderDocument> {
    return this.orderModel;
  }
}
