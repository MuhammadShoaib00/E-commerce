import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async findAll(query: ProductQueryDto) {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sort = 'newest',
      page = 1,
      limit = 12,
    } = query;

    const filter: FilterQuery<Product> = {};

    if (search) {
      filter.$text = { $search: search };
    }

    if (category) {
      filter.category = new Types.ObjectId(category);
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    const sortMap: Record<string, string> = {
      price_asc: 'price',
      price_desc: '-price',
      newest: '-createdAt',
      name: 'name',
    };
    const sortStr = sortMap[sort] ?? '-createdAt';

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('category', 'name slug')
        .sort(sortStr)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
    };
  }

  async findById(id: string): Promise<any> {
    const product = await this.productModel
      .findById(id)
      .populate('category', 'name slug')
      .lean()
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /**
   * Content-based "related products": same category, excluding the current item,
   * in stock, newest first. Falls back to other newest in-stock products when the
   * item has no category. Deterministic, no cold-start. (See NOTES.md §9.)
   */
  async findRelated(id: string, limit = 4): Promise<any[]> {
    const product = await this.productModel.findById(id).lean().exec();
    if (!product) throw new NotFoundException('Product not found');

    const filter: FilterQuery<Product> = {
      _id: { $ne: product._id },
      stockQuantity: { $gt: 0 },
    };
    if (product.category) filter.category = product.category;

    return this.productModel
      .find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    return this.productModel.create(dto);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    const product = await this.productModel
      .findByIdAndUpdate(id, dto, { new: true })
      .populate('category', 'name slug')
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Product not found');
  }

  getModel(): Model<ProductDocument> {
    return this.productModel;
  }
}
