import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrdersService } from './orders.service';
import { Order } from './schemas/order.schema';
import { Cart } from '../cart/schemas/cart.schema';
import { Product } from '../products/schemas/product.schema';
import { PaymentsService } from '../payments/payments.service';

const oid = (n: number) => new Types.ObjectId(String(n).padStart(24, '0'));

const makeProduct = (n: number, name: string, price: number, stock: number) => ({
  _id: oid(n),
  name,
  price,
  stockQuantity: stock,
});

const makeCartItem = (n: number, quantity: number) => ({
  productId: oid(n),
  quantity,
});

const chainLean = (result: any) => ({
  lean: () => ({ exec: () => Promise.resolve(result) }),
});

describe('OrdersService', () => {
  let service: OrdersService;

  const mockOrderModel = { create: jest.fn() };
  const mockCartModel = { findOne: jest.fn(), deleteOne: jest.fn() };
  const mockProductModel = { find: jest.fn(), updateOne: jest.fn() };
  const mockPaymentsService = { verifyPayment: jest.fn() };

  beforeEach(async () => {
    // resetAllMocks clears both call history AND queued return values
    jest.resetAllMocks();
    // Default: payment verification succeeds and returns a reference.
    mockPaymentsService.verifyPayment.mockResolvedValue('mock_ref_123');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(Cart.name), useValue: mockCartModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  const userId = new Types.ObjectId().toString();
  const dto = { street: '1 Test St', city: 'London', country: 'UK' };

  it('throws BadRequestException when cart is empty', async () => {
    mockCartModel.findOne.mockReturnValue(chainLean(null));
    await expect(service.checkout(userId, dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ConflictException (409) when stock is insufficient', async () => {
    const product = makeProduct(1, 'Widget', 1000, 2);
    const cart = { items: [makeCartItem(1, 5)] };

    mockCartModel.findOne.mockReturnValue(chainLean(cart));
    mockProductModel.find.mockReturnValue(chainLean([product]));

    await expect(service.checkout(userId, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(mockProductModel.updateOne).not.toHaveBeenCalled();
  });

  it('rolls back decremented items when a later atomic decrement fails (race condition)', async () => {
    // Both products have sufficient stock to pass initial validation
    const p1 = makeProduct(1, 'Alpha', 500, 10);
    const p2 = makeProduct(2, 'Beta', 500, 10);
    const cart = { items: [makeCartItem(1, 2), makeCartItem(2, 5)] };

    mockCartModel.findOne.mockReturnValue(chainLean(cart));
    mockProductModel.find.mockReturnValue(chainLean([p1, p2]));

    // First decrement succeeds, second fails (race condition)
    mockProductModel.updateOne
      .mockResolvedValueOnce({ matchedCount: 1 })
      .mockResolvedValueOnce({ matchedCount: 0 })
      .mockResolvedValue({ matchedCount: 1 }); // rollback call

    await expect(service.checkout(userId, dto)).rejects.toBeInstanceOf(ConflictException);

    // 2 decrement attempts + 1 rollback for p1
    expect(mockProductModel.updateOne).toHaveBeenCalledTimes(3);
    const rollbackCall = mockProductModel.updateOne.mock.calls[2];
    expect(rollbackCall[1]).toEqual({ $inc: { stockQuantity: 2 } });
  });

  it('computes totalAmount from server-fetched product prices (not cart)', async () => {
    const product = makeProduct(1, 'Gizmo', 1500, 10);
    const cart = { items: [makeCartItem(1, 3)] };

    mockCartModel.findOne.mockReturnValue(chainLean(cart));
    mockProductModel.find.mockReturnValue(chainLean([product]));
    mockProductModel.updateOne.mockResolvedValue({ matchedCount: 1 });
    mockOrderModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
    mockCartModel.deleteOne.mockResolvedValue({});

    await service.checkout(userId, dto);

    expect(mockOrderModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 4500 }), // 1500 × 3
    );
  });

  it('deletes cart after order is persisted', async () => {
    const product = makeProduct(1, 'Gadget', 999, 5);
    const cart = { items: [makeCartItem(1, 1)] };

    mockCartModel.findOne.mockReturnValue(chainLean(cart));
    mockProductModel.find.mockReturnValue(chainLean([product]));
    mockProductModel.updateOne.mockResolvedValue({ matchedCount: 1 });
    mockOrderModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
    mockCartModel.deleteOne.mockResolvedValue({});

    await service.checkout(userId, dto);

    expect(mockOrderModel.create).toHaveBeenCalledTimes(1);
    expect(mockCartModel.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('rejects checkout and touches no stock when payment verification fails', async () => {
    const product = makeProduct(1, 'Gadget', 999, 5);
    const cart = { items: [makeCartItem(1, 1)] };

    mockCartModel.findOne.mockReturnValue(chainLean(cart));
    mockProductModel.find.mockReturnValue(chainLean([product]));
    mockPaymentsService.verifyPayment.mockRejectedValueOnce(
      new BadRequestException('Payment not completed'),
    );

    await expect(service.checkout(userId, dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(mockProductModel.updateOne).not.toHaveBeenCalled();
    expect(mockOrderModel.create).not.toHaveBeenCalled();
  });

  it('verifies payment with the server-computed total and the supplied paymentIntentId', async () => {
    const product = makeProduct(1, 'Gizmo', 1500, 10);
    const cart = { items: [makeCartItem(1, 2)] };

    mockCartModel.findOne.mockReturnValue(chainLean(cart));
    mockProductModel.find.mockReturnValue(chainLean([product]));
    mockProductModel.updateOne.mockResolvedValue({ matchedCount: 1 });
    mockOrderModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
    mockCartModel.deleteOne.mockResolvedValue({});

    await service.checkout(userId, { ...dto, paymentIntentId: 'pi_test_123' });

    expect(mockPaymentsService.verifyPayment).toHaveBeenCalledWith('pi_test_123', 3000, userId);
  });
});
