import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { RedisService } from '../redis/redis.service';
import { cartSelect } from './utils/cart-select.util';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { getCartKey, getItemField, loadCartFromRedis, CART_TTL } from './utils/cart-redis.util';
import { buildCartResponse } from './utils/cart-response.util';
import { syncCartToDB } from './utils/cart-sync.util';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) { }

  // GET: Đọc từ Redis → Build response với giá realtime
  async getCart(userId: string) {
    const redisCart = await loadCartFromRedis(this.redisService, userId);

    if (!redisCart) {
      const dbCart = await this.prisma.cart.findUnique({
        where: { userId },
        select: cartSelect,
      });

      if (!dbCart) {
        return {
          items: [],
          totalPrice: 0,
        };
      }

      const key = getCartKey(userId);
      await this.redisService.hset(key, 'cartId', dbCart.cartId);
      await this.redisService.hset(key, 'updatedAt', new Date().toISOString());

      for (const item of dbCart.items) {
        if (item.optionId) {
          await this.redisService.hset(
            key,
            getItemField(item.productId, item.optionId),
            item.quantity.toString(),
          );
        }
      }

      await this.redisService.expire(key, CART_TTL);

      return dbCart;
    }

    return await buildCartResponse(this.prisma, userId, redisCart);
  }

  
  async addToCart(userId: string, data: AddCartItemDto) {
    const product = await this.prisma.product.findUnique({
      where: { productId: data.productId },
      select: { productId: true },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại!');
    }

    if (!data.optionId) {
      throw new BadRequestException('Vui lòng chọn tùy chọn sản phẩm!');
    }

    const option = await this.prisma.productOption.findUnique({
      where: { optionId: data.optionId },
      select: {
        optionId: true,
        productId: true,
        price: true,
        salePrice: true,
        stockQuantity: true,
        isActive: true,
      },
    });

    if (!option) {
      throw new NotFoundException('Tùy chọn sản phẩm không tồn tại!');
    }

    if (option.productId !== data.productId) {
      throw new BadRequestException('Tùy chọn không thuộc sản phẩm này!');
    }

    if (!option.isActive) {
      throw new BadRequestException('Tùy chọn sản phẩm đã bị vô hiệu hóa!');
    }

    
    let dbCart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { cartId: true },
    });

    if (!dbCart) {
      dbCart = await this.prisma.cart.create({
        data: { userId },
        select: { cartId: true },
      });
    }

    const key = getCartKey(userId);
    const itemField = getItemField(data.productId, data.optionId);

    // Kiểm tra stock trước khi increment
    const currentQuantityStr = await this.redisService.hget(key, itemField);
    const currentQuantity = parseInt(currentQuantityStr || '0', 10);
    const newQuantity = currentQuantity + data.quantity;

    if (option.stockQuantity < newQuantity) {
      throw new BadRequestException(
        `Số lượng trong kho không đủ! Chỉ còn ${option.stockQuantity} sản phẩm.`,
      );
    }

    // Atomic increment trong Redis
    await this.redisService.hset(key, 'cartId', dbCart.cartId);
    await this.redisService.hincrby(key, itemField, data.quantity);
    await this.redisService.hset(key, 'updatedAt', new Date().toISOString());
    await this.redisService.expire(key, CART_TTL);

    // Sync DB async (không block response)
    syncCartToDB(this.prisma, this.redisService, userId).catch((err) => console.error('Sync cart to DB failed:', err));

    // Return cart với giá realtime
    const redisCart = await loadCartFromRedis(this.redisService, userId);
    return await buildCartResponse(this.prisma, userId, redisCart!);
  }

  // UPDATE: Set quantity mới (nhận productId + optionId)
  async updateCartItem(userId: string, productId: string, optionId: string, quantity: number) {
    if (!quantity) {
      throw new BadRequestException('Số lượng không được để trống!');
    }

    // 1. Validate Stock từ DB (chỉ check hàng và kho, không check cartItem trong DB)
    const option = await this.prisma.productOption.findUnique({
      where: { optionId },
      select: {
        stockQuantity: true,
        productId: true,
        isActive: true,
      },
    });

    if (!option) {
      throw new NotFoundException('Tùy chọn sản phẩm không tồn tại!');
    }

    if (option.productId !== productId) {
      throw new BadRequestException('Dữ liệu không khớp!');
    }

    if (!option.isActive) {
      throw new BadRequestException('Sản phẩm đã ngừng kinh doanh!');
    }

    if (option.stockQuantity < quantity) {
      throw new BadRequestException(
        `Số lượng trong kho không đủ! Chỉ còn ${option.stockQuantity} sản phẩm.`,
      );
    }

    // 2. Update thẳng vào Redis (không quan tâm DB có cartItem chưa)
    const key = getCartKey(userId);
    const itemField = getItemField(productId, optionId);

    // Kiểm tra xem item có trong giỏ Redis không
    const exists = await this.redisService.hexists(key, itemField);
    if (!exists) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng!');
    }

    await this.redisService.hset(key, itemField, quantity.toString());
    await this.redisService.hset(key, 'updatedAt', new Date().toISOString());
    await this.redisService.expire(key, CART_TTL);

    // 3. Sync DB async
    syncCartToDB(this.prisma, this.redisService, userId).catch((err) => console.error('Sync error:', err));

    // 4. Return
    const redisCart = await loadCartFromRedis(this.redisService, userId);
    return await buildCartResponse(this.prisma, userId, redisCart!);
  }

  // REMOVE: Xóa item khỏi Redis (nhận productId + optionId)
  async removeCartItem(userId: string, productId: string, optionId: string) {
    const key = getCartKey(userId);
    const itemField = getItemField(productId, optionId);

    // Xóa thẳng trong Redis
    await this.redisService.hdel(key, itemField);
    await this.redisService.hset(key, 'updatedAt', new Date().toISOString());
    await this.redisService.expire(key, CART_TTL);

    // Sync DB async
    syncCartToDB(this.prisma, this.redisService, userId).catch((err) => console.error('Sync error:', err));

    // Return
    const redisCart = await loadCartFromRedis(this.redisService, userId);
    return await buildCartResponse(this.prisma, userId, redisCart!);
  }

  // CLEAR: Xóa toàn bộ cart
  async clearCart(userId: string) {
    const key = getCartKey(userId);
    await this.redisService.del(key);

    // Sync DB async
    syncCartToDB(this.prisma, this.redisService, userId).catch((err) => console.error('Sync cart to DB failed:', err));

    return {
      items: [],
      totalPrice: 0,
    };
  }
}
