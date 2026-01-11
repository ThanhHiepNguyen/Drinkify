import { RedisService } from '../../redis/redis.service';

export const CART_TTL = 7 * 24 * 60 * 60; // 7 ngày


export function getCartKey(userId: string): string {
  return `cart:${userId}`;
}

export function getItemField(productId: string, optionId: string): string {
  return `item:${productId}:${optionId}`;
}


export async function loadCartFromRedis(
  redisService: RedisService,
  userId: string,
): Promise<{ cartId: string; updatedAt: Date; items: Array<{ productId: string; optionId: string; quantity: number }> } | null> {
  const key = getCartKey(userId);
  const hash = await redisService.hgetall(key);

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

