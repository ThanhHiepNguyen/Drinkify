export const reviewSelect = {
  reviewId: true,
  productId: true,
  userId: true,
  rating: true,
  comment: true,
  reply: true,
  repliedBy: true,
  repliedAt: true,
  createdAt: true,
  user: {
    select: {
      userId: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
  product: {
    select: {
      productId: true,
      name: true,
      thumbnail: true,
      category: {
        select: {
          categoryId: true,
          name: true,
        },
      },
    },
  },
};

