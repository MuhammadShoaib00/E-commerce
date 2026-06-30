import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CartService } from '../cart/cart.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly cart: CartService,
  ) {}

  /**
   * Create a PaymentIntent for the caller's current cart. The amount is computed
   * server-side from the cart — never taken from the client.
   */
  @Post('intent')
  @HttpCode(HttpStatus.OK)
  async createIntent(@CurrentUser() user: { userId: string }) {
    const cart = await this.cart.getCart(user.userId);
    return this.payments.createPaymentIntent(cart.total, user.userId);
  }
}
