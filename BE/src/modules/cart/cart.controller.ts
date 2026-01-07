import { Body, Controller, Delete, Get, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getCart(@Req() req: { user: { userId: string } }) {
    const cart = await this.cartService.getCart(req.user.userId);
    return {
      cart,
      message: 'Lấy giỏ hàng thành công',
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async addToCart(
    @Body() addCartItemDto: AddCartItemDto,
    @Req() req: { user: { userId: string } }
  ) {
    const cart = await this.cartService.addToCart(req.user.userId, addCartItemDto);
    return {
      cart,
      message: 'Thêm vào giỏ hàng thành công',
    };
  }

  @Put('items')
  @UseGuards(JwtAuthGuard)
  async updateItem(
    @Req() req: { user: { userId: string } },
    @Body() body: { productId: string; optionId: string; quantity: number }
  ) {
    const cart = await this.cartService.updateCartItem(
      req.user.userId,
      body.productId,
      body.optionId,
      body.quantity
    );
    return {
      cart,
      message: 'Cập nhật giỏ hàng thành công',
    };
  }

  @Delete('items')
  @UseGuards(JwtAuthGuard)
  async removeItem(
    @Req() req: { user: { userId: string } },
    @Query('productId') productId: string,
    @Query('optionId') optionId: string
  ) {
    const cart = await this.cartService.removeCartItem(req.user.userId, productId, optionId);
    return {
      cart,
      message: 'Xóa sản phẩm khỏi giỏ hàng thành công',
    };
  }

  @Delete('clear')
  @UseGuards(JwtAuthGuard)
  async clearCart(@Req() req: { user: { userId: string } }) {
    const cart = await this.cartService.clearCart(req.user.userId);
    return {
      cart,
      message: 'Xóa tất cả sản phẩm khỏi giỏ hàng thành công',
    };
  }
}

