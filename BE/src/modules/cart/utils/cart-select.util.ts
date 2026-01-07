export const cartSelect = {
    cartId: true,
    userId: true,
    totalPrice: true,
    createdAt: true,
    updatedAt: true,
    items: {
        select: {
            cartItemId: true,
            productId: true,
            optionId: true,
            quantity: true,
            savedPrice: true,
            addedAt: true,
            product: {
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
            },
            option: {
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
            },
        },
        orderBy: {
            addedAt: 'desc' as const,
        },
    },
};

