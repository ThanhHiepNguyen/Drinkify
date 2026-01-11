import { PrismaService } from '../../../prisma.service';

export interface RedisCartItem {
  productId: string;
  optionId: string;
  quantity: number;
}

export interface RedisCart {
  cartId: string;
  updatedAt: Date;
  items: RedisCartItem[];
}


export async function buildCartResponse(
  prisma: PrismaService,
  userId: string,
  redisCart: RedisCart,
) {
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


  const productIds = [...new Set(redisCart.items.map((item) => item.productId))];
  const optionIds = redisCart.items.map((item) => item.optionId).filter(Boolean);

  const [products, options] = await Promise.all([
    prisma.product.findMany({
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
    prisma.productOption.findMany({
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
        cartItemId: `temp-${item.productId}-${item.optionId}`, 
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

