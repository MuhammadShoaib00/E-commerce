import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async getCart(userId: string): Promise<any> {
    const cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate({ path: 'items.productId', model: 'Product', select: 'name price imageUrl stockQuantity category' })
      .lean()
      .exec();

    if (!cart) return { userId, items: [], total: 0 };

    const total = (cart.items as any[]).reduce((sum: number, item: any) => {
      const price = item.productId?.price ?? 0;
      return sum + price * item.quantity;
    }, 0);

    return { ...cart, total };
  }

  async addItem(userId: string, dto: AddToCartDto): Promise<any> {
    const product = await this.productModel.findById(dto.productId).exec();
    if (!product) throw new NotFoundException('Product not found');

    const cart = await this.cartModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $setOnInsert: { userId: new Types.ObjectId(userId) } },
      { upsert: true, new: true },
    );

    const existingIndex = cart.items.findIndex(
      (item) => item.productId.toString() === dto.productId,
    );

    // Validate the *resulting* line quantity against stock, not just the
    // increment — otherwise repeated adds could stack a line above stock.
    const currentQty = existingIndex >= 0 ? cart.items[existingIndex].quantity : 0;
    const resultingQty = currentQty + dto.quantity;
    if (product.stockQuantity < resultingQty) {
      throw new BadRequestException(
        `Only ${product.stockQuantity} units available` +
          (currentQty ? ` (you already have ${currentQty} in your cart)` : ''),
      );
    }

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity = resultingQty;
    } else {
      cart.items.push({
        productId: new Types.ObjectId(dto.productId),
        quantity: dto.quantity,
      });
    }

    await cart.save();
    return this.getCart(userId);
  }

  async updateItem(userId: string, productId: string, dto: UpdateCartItemDto): Promise<any> {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    if (!cart) throw new NotFoundException('Cart not found');

    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (!item) throw new NotFoundException('Item not in cart');

    const product = await this.productModel.findById(productId).exec();
    if (!product) throw new NotFoundException('Product not found');
    if (product.stockQuantity < dto.quantity) {
      throw new BadRequestException(`Only ${product.stockQuantity} units available`);
    }

    item.quantity = dto.quantity;
    await cart.save();
    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string): Promise<any> {
    await this.cartModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $pull: { items: { productId: new Types.ObjectId(productId) } } },
    ).exec();
    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<any> {
    await this.cartModel.findOneAndDelete({ userId: new Types.ObjectId(userId) }).exec();
    return { userId, items: [], total: 0 };
  }
}
