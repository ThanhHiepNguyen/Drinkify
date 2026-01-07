export const paymentSelect = {
  paymentId: true,
  orderId: true,
  paymentStatus: true,
  amount: true,
  paymentMethod: true,
  transactionDate: true,
  createdAt: true,
  updatedAt: true,
  order: {
    select: {
      orderId: true,
      userId: true,
      totalPrice: true,
      status: true,
      shippingAddress: true,
      paymentMethod: true,
      createdAt: true,
      user: {
        select: {
          userId: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  },
};

