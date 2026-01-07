import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { RedisService } from '../redis/redis.service';
import { cartSelect } from './utils/cart-select.util';
import { AddCartItemDto } from './dto/add-cart-item.dto';

const CART_TTL = 7 * 24 * 60 * 60; // 7 ngày

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) { }

  private getCartKey(userId: string): string {
    return `cart:${userId}`;
  }

  private getItemField(productId: string, optionId: string): string {
    return `item:${productId}:${optionId}`;
  }

  // Load cart từ Redis Hash phẳng
  private async loadCartFromRedis(userId: string): Promise<{ cartId: string; updatedAt: Date; items: Array<{ productId: string; optionId: string; quantity: number }> } | null> {
    const key = this.getCartKey(userId);
    const hash = await this.redisService.hgetall(key);

    if (!hash || Object.keys(hash).length === 0 || !hash.cartId) {
      return null;
    }

    // Lọc các field bắt đầu bằng "item:"
    const items: Array<{ productId: string; optionId: string; quantity: number }> = [];
    for (const [field, value] of Object.entries(hash)) {
      if (field.startsWith('item:')) {
        const [, productId, optionId] = field.split(':');
        items.push({
          productId,
          optionId,
          quantity: parseInt(value, 10),
        });
      }
    }

    return {
      cartId: hash.cartId,
      updatedAt: hash.updatedAt ? new Date(hash.updatedAt) : new Date(),
      items,
    };
  }

  // Build cart response với giá realtime từ DB
  private async buildCartResponse(userId: string, redisCart: { cartId: string; updatedAt: Date; items: Array<{ productId: string; optionId: string; quantity: number }> }) {
    if (redisCart.items.length === 0) {
      return {
        cartId: redisCart.cartId,
        userId,
        items: [],
        totalPrice: 0,
        createdAt: new Date(),
        updatedAt: redisCart.updatedAt,
      };
    }

    // Query giá realtime từ DB (không tin giá trong Redis)
    const productIds = [...new Set(redisCart.items.map((item) => item.productId))];
    const optionIds = redisCart.items.map((item) => item.optionId).filter(Boolean);

    const [products, options] = await Promise.all([
      this.prisma.product.findMany({
        where: { productId: { in: productIds } },
        select: {
          productId: true,
          name: true,
          categoryId: true,
          thumbnail: true,
          category: {
            select: {
              categoryId: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.productOption.findMany({
        where: { optionId: { in: optionIds } },
        select: {
          optionId: true,
          productId: true,
          size: true,
          material: true,
          threadType: true,
          headType: true,
          price: true,
          salePrice: true,
          discountPercent: true,
          stockQuantity: true,
          unit: true,
          image: true,
          isActive: true,
        },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.productId, p]));
    const optionMap = new Map(options.map((o) => [o.optionId, o]));

    // Build items với giá realtime
    const cartItems = redisCart.items
      .map((item) => {
        const product = productMap.get(item.productId);
        const option = optionMap.get(item.optionId);

        if (!product || !option) return null;

        const savedPrice = option.salePrice || option.price;

        return {
          cartItemId: `temp-${item.productId}-${item.optionId}`, // Temporary ID
          productId: item.productId,
          optionId: item.optionId,
          quantity: item.quantity,
          savedPrice,
          addedAt: new Date(),
          product: {
            productId: product.productId,
            name: product.name,
            categoryId: product.categoryId,
            thumbnail: product.thumbnail,
            category: product.category,
          },
          option: {
            optionId: option.optionId,
            productId: option.productId,
            size: option.size,
            material: option.material,
            threadType: option.threadType,
            headType: option.headType,
            price: option.price,
            salePrice: option.salePrice,
            discountPercent: option.discountPercent,
            stockQuantity: option.stockQuantity,
            unit: option.unit,
            image: option.image,
            isActive: option.isActive,
          },
        };
      })
      .filter(Boolean) as any[];

    // Tính totalPrice từ giá realtime
    const totalPrice = cartItems.reduce((sum, item) => sum + item.savedPrice * item.quantity, 0);

    return {
      cartId: redisCart.cartId,
      userId,
      items: cartItems,
      totalPrice,
      createdAt: new Date(),
      updatedAt: redisCart.updatedAt,
    };
  }

  // Sync Redis → DB (async, không block)
  private async syncCartToDB(userId: string) {
    try {
      const redisCart = await this.loadCartFromRedis(userId);
      if (!redisCart || redisCart.items.length === 0) {
        // Nếu Redis rỗng, xóa cart trong DB
        const dbCart = await this.prisma.cart.findUnique({
          where: { userId },
          select: { cartId: true },
        });
        if (dbCart) {
          await this.prisma.$transaction(async (tx) => {
            await tx.cartItem.deleteMany({ where: { cartId: dbCart.cartId } });
            await tx.cart.update({ where: { cartId: dbCart.cartId }, data: { totalPrice: 0 } });
          });
        }
        return;
      }

      // Đảm bảo cart tồn tại trong DB
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

      // Query giá từ DB để sync
      const optionIds = redisCart.items.map((item) => item.optionId).filter(Boolean);
      const options = await this.prisma.productOption.findMany({
        where: { optionId: { in: optionIds } },
        select: {
          optionId: true,
          price: true,
          salePrice: true,
        },
      });

      const optionPriceMap = new Map(
        options.map((o) => [o.optionId, o.salePrice || o.price]),
      );

      // Full replacement: Xóa hết → Insert lại
      await this.prisma.$transaction(async (tx) => {
        await tx.cartItem.deleteMany({ where: { cartId: dbCart.cartId } });

        const cartItemsData = redisCart.items
          .filter((item) => optionPriceMap.has(item.optionId))
          .map((item) => ({
            cartId: dbCart.cartId,
            productId: item.productId,
            optionId: item.optionId,
            quantity: item.quantity,
            savedPrice: optionPriceMap.get(item.optionId)!,
          }));

        if (cartItemsData.length > 0) {
          await tx.cartItem.createMany({ data: cartItemsData });
        }

        const totalPrice = cartItemsData.reduce(
          (sum, item) => sum + item.savedPrice * item.quantity,
          0,
        );

        await tx.cart.update({
          where: { cartId: dbCart.cartId },
          data: { totalPrice },
        });
      });
    } catch (error) {
      console.error('Sync cart to DB failed:', error);
      // Không throw để không block response
    }
  }

  // GET: Đọc từ Redis → Build response với giá realtime
  async getCart(userId: string) {
    const redisCart = await this.loadCartFromRedis(userId);

    if (!redisCart) {
      // Fallback về DB
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

      // Lưu vào Redis để lần sau đọc nhanh hơn
      const key = this.getCartKey(userId);
      await this.redisService.hset(key, 'cartId', dbCart.cartId);
      await this.redisService.hset(key, 'updatedAt', new Date().toISOString());

      for (const item of dbCart.items) {
        if (item.optionId) {
          await this.redisService.hset(
            key,
            this.getItemField(item.productId, item.optionId),
            item.quantity,
          );
        }
      }

      await this.redisService.expire(key, CART_TTL);

      return dbCart;
    }

    // Build response với giá realtime từ DB
    return await this.buildCartResponse(userId, redisCart);
  }

  // ADD: Atomic increment với HINCRBY
  async addToCart(userId: string, data: AddCartItemDto) {
    // Validate từ DB
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

    // Đảm bảo cart tồn tại trong DB
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

    const key = this.getCartKey(userId);
    const itemField = this.getItemField(data.productId, data.optionId);

    // Kiểm tra stock trước khi increment
    const currentQuantity = parseInt(
      (await this.redisService.hgetall(key))[itemField] || '0',
      10,
    );
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
    this.syncCartToDB(userId).catch((err) => console.error('Sync cart to DB failed:', err));

    // Return cart với giá realtime
    const redisCart = await this.loadCartFromRedis(userId);
    return await this.buildCartResponse(userId, redisCart!);
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
    const key = this.getCartKey(userId);
    const itemField = this.getItemField(productId, optionId);

    // Kiểm tra xem item có trong giỏ Redis không
    const exists = await this.redisService.hexists(key, itemField);
    if (!exists) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng!');
    }

    await this.redisService.hset(key, itemField, quantity);
    await this.redisService.hset(key, 'updatedAt', new Date().toISOString());
    await this.redisService.expire(key, CART_TTL);

    // 3. Sync DB async
    this.syncCartToDB(userId).catch((err) => console.error('Sync error:', err));

    // 4. Return
    const redisCart = await this.loadCartFromRedis(userId);
    return await this.buildCartResponse(userId, redisCart!);
  }

  // REMOVE: Xóa item khỏi Redis (nhận productId + optionId)
  async removeCartItem(userId: string, productId: string, optionId: string) {
    const key = this.getCartKey(userId);
    const itemField = this.getItemField(productId, optionId);

    // Xóa thẳng trong Redis
    await this.redisService.hdel(key, itemField);
    await this.redisService.hset(key, 'updatedAt', new Date().toISOString());
    await this.redisService.expire(key, CART_TTL);

    // Sync DB async
    this.syncCartToDB(userId).catch((err) => console.error('Sync error:', err));

    // Return
    const redisCart = await this.loadCartFromRedis(userId);
    return await this.buildCartResponse(userId, redisCart!);
  }

  // CLEAR: Xóa toàn bộ cart
  async clearCart(userId: string) {
    const key = this.getCartKey(userId);
    await this.redisService.del(key);

    // Sync DB async
    this.syncCartToDB(userId).catch((err) => console.error('Sync cart to DB failed:', err));

    return {
      items: [],
      totalPrice: 0,
    };
  }
}
