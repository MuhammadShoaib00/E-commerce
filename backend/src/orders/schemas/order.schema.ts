import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderStatus } from '../../common/enums/order-status.enum';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 1 })
  quantity: number;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ required: true })
  paymentRef: string;

  @Prop({
    type: {
      street: String,
      city: String,
      country: String,
    },
    default: {},
  })
  shippingAddress: { street?: string; city?: string; country?: string };
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// User order-history: filter by userId, sort by createdAt desc.
OrderSchema.index({ userId: 1, createdAt: -1 });
// Admin order list: optional status filter + createdAt sort; analytics groups by status.
OrderSchema.index({ status: 1, createdAt: -1 });
