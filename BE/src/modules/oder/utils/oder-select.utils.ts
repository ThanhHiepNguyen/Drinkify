export const orderSelect = {
    orderId: true,
    userId: true,
    totalPrice: true,
    status: true,
    shippingAddress: true,
    paymentMethod: true,
    note: true,
    createdAt: true,
    updatedAt: true,
    user: {
        select: {
            userId: true,
            fullName: true,
            email: true,
            phone: true,
            address: true,
        },
    },
    items: {
        select: {
            orderItemId: true,
            productId: true,
            optionId: true,
            quantity: true,
            unitPrice: true,
            optionPrice: true,
            lineTotal: true,
            createdAt: true,
            updatedAt: true,
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
            createdAt: 'desc' as const,
        },
    },
    payments: {
        select: {
            paymentId: true,
            paymentStatus: true,
            amount: true,
            paymentMethod: true,
            transactionDate: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: {
            createdAt: 'desc' as const,
        },
    },
};