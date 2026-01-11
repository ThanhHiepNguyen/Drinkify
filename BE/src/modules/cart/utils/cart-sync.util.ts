import { PrismaService } from '../../../prisma.service';
import { RedisService } from '../../redis/redis.service';
import { loadCartFromRedis } from './cart-redis.util';


export async function syncCartToDB(
    prisma: PrismaService,
    redisService: RedisService,
    userId: string,
) {
    try {
        const redisCart = await loadCartFromRedis(redisService, userId);
        if (!redisCart || redisCart.items.length === 0) {
            // Nếu Redis rỗng, xóa cart trong DB
            const dbCart = await prisma.cart.findUnique({
                where: { userId },
                select: { cartId: true },
            });
            if (dbCart) {
                await prisma.$transaction(async (tx) => {
                    await tx.cartItem.deleteMany({ where: { cartId: dbCart.cartId } });
                    await tx.cart.update({ where: { cartId: dbCart.cartId }, data: { totalPrice: 0 } });
                });
            }
            return;
        }

        // Đảm bảo cart tồn tại trong DB
        let dbCart = await prisma.cart.findUnique({
            where: { userId },
            select: { cartId: true },
        });

        if (!dbCart) {
            dbCart = await prisma.cart.create({
                data: { userId },
                select: { cartId: true },
            });
        }

        // Query giá từ DB để sync
        const optionIds = redisCart.items.map((item) => item.optionId).filter(Boolean);
        const options = await prisma.productOption.findMany({
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
        await prisma.$transaction(async (tx) => {
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
       
    }
}

