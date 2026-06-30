import { IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  /** Stripe PaymentIntent id (when Stripe is enabled). Verified server-side. */
  @IsOptional()
  @IsString()
  paymentIntentId?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;
}
