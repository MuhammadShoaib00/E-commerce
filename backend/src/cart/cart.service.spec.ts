import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CartService } from './cart.service';
import { Cart } from './schemas/cart.schema';
import { Product } from '../products/schemas/product.schema';

const oid = (n: number) => new Types.ObjectId(String(n).padStart(24, '0'));

const chainExec = (result: any) => ({ exec: () => Promise.resolve(result) });
const chainPopulateLean = (result: any) => ({
  populate: () => ({ lean: () => chainExec(result) }),
});

describe('CartService (addItem stock integrity)', () => {
  let service: CartService;

  const mockCartModel = { findOne: jest.fn(), findOneAndUpdate: jest.fn() };
  const mockProductModel = { findById: jest.fn() };

  const userId = oid(99).toString();
  const productId = oid(1).toString();

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getModelToken(Cart.name), useValue: mockCartModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
      ],
    }).compile();
    service = module.get<CartService>(CartService);
  });

  it('rejects adding more than available stock for a new line', async () => {
    mockProductModel.findById.mockReturnValue(
      chainExec({ _id: oid(1), stockQuantity: 3 }),
    );
    mockCartModel.findOneAndUpdate.mockResolvedValue({ items: [], save: jest.fn() });

    await expect(
      service.addItem(userId, { productId, quantity: 5 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when existing cart qty + new qty exceeds stock (cumulative)', async () => {
    // Stock is 5; cart already holds 4; adding 2 more would be 6 → must reject.
    mockProductModel.findById.mockReturnValue(
      chainExec({ _id: oid(1), stockQuantity: 5 }),
    );
    const save = jest.fn();
    mockCartModel.findOneAndUpdate.mockResolvedValue({
      items: [{ productId: oid(1), quantity: 4 }],
      save,
    });

    await expect(
      service.addItem(userId, { productId, quantity: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(save).not.toHaveBeenCalled();
  });

  it('accumulates quantity on an existing line when within stock', async () => {
    mockProductModel.findById.mockReturnValue(
      chainExec({ _id: oid(1), stockQuantity: 10 }),
    );
    const items = [{ productId: oid(1), quantity: 4 }];
    const save = jest.fn().mockResolvedValue(undefined);
    mockCartModel.findOneAndUpdate.mockResolvedValue({ items, save });
    // getCart() is called at the end; stub findOne for that read path.
    mockCartModel.findOne.mockReturnValue(chainPopulateLean(null));

    await service.addItem(userId, { productId, quantity: 3 });

    expect(items[0].quantity).toBe(7); // 4 + 3, not overwritten with 3
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('throws NotFound when the product does not exist', async () => {
    mockProductModel.findById.mockReturnValue(chainExec(null));
    await expect(
      service.addItem(userId, { productId, quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
