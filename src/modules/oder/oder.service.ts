import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateOderDto } from './dto/create-oder.dto';
import { orderSelect } from './utils/oder-select.utils';
import {
  OrderStatus,
  PaymentStatus,
  UserRole,
} from 'src/generated/prisma/enums';
import { Prisma } from 'src/generated/prisma/client';
import { UpdateOderDto } from './dto/update-oder.dto';

@Injectable()
export class OderService {
  constructor(private prisma: PrismaService) { }

  async createOder(userId: string, data: CreateOderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                productId: true,
                name: true,
              },
            },
            option: {
              select: {
                optionId: true,
                price: true,
                salePrice: true,
                stockQuantity: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new NotFoundException('Giỏ hàng không tồn tại hoặc trống');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      let totalPrice = 0;

      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

      for (const cartItem of cart.items) {
        const { product, option, quantity, savedPrice } = cartItem;

        if (!option) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" không có tùy chọn hợp lệ`,
          );
        }

        if (!option.isActive) {
          throw new BadRequestException(
            `Tùy chọn của sản phẩm "${product.name}" đã bị vô hiệu hóa`,
          );
        }

        if (option.stockQuantity < quantity) {
          throw new BadRequestException(
            `Số lượng tồn kho của sản phẩm "${product.name}" không đủ. Chỉ còn ${option.stockQuantity} sản phẩm.`,
          );
        }

        const lineTotal = savedPrice * quantity;
        totalPrice += lineTotal;

        orderItemsData.push({
          productId: product.productId,
          optionId: option.optionId,
          quantity,
          unitPrice: savedPrice,
          optionPrice: option.salePrice ?? option.price,
          lineTotal,
        });

        await tx.productOption.update({
          where: { optionId: option.optionId },
          data: {
            stockQuantity: {
              decrement: quantity,
            },
          },
        });
      }

      const createdOrder = await tx.order.create({
        data: {
          userId,
          totalPrice,
          shippingAddress: data.shippingAddress,
          paymentMethod: data.paymentMethod,
          note: data.note,
          items: {
            createMany: {
              data: orderItemsData,
            },
          },
          payments: {
            create: {
              amount: totalPrice,
              paymentStatus: PaymentStatus.UNPAID,
              paymentMethod: data.paymentMethod,
            },
          },
        },
        select: orderSelect,
      });

      await tx.cartItem.deleteMany({
        where: { cartId: cart.cartId },
      });

      await tx.cart.update({
        where: { cartId: cart.cartId },
        data: { totalPrice: 0 },
      });

      return createdOrder;
    });

    return order;
  }

  async getOrderById(orderId: string, userId: string, userRole: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
      select: orderSelect,
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }


    if (userRole === UserRole.CUSTOMER && order.userId !== userId) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    return order;
  }

  async getAllOrders(
    userId: string,
    userRole: string,
    page: number = 1,
    limit: number = 12,
    status?: OrderStatus,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(userRole === UserRole.CUSTOMER && { userId }),
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        select: orderSelect,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }


  async updateOderStatus(
    orderId: string,
    userId: string,
    userRole: string,
    data: UpdateOderDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        userId: true,
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }


    if (userRole === UserRole.CUSTOMER && order.userId !== userId) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }


    if (
      order.status === OrderStatus.DELIVERED &&
      data.status !== OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        'Không thể thay đổi trạng thái đơn hàng đã được giao',
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Không thể thay đổi trạng thái đơn hàng đã bị hủy',
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where: { orderId: order.orderId },
      data: { status: data.status },
      select: orderSelect,
    });

    return updatedOrder;
  }

  async cancelOrder(
    orderId: string,
    userId: string,
    userRole: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
      include: {
        items: {
          select: {
            optionId: true,
            quantity: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    if (userRole === UserRole.CUSTOMER && order.userId !== userId) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }


    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        `Không thể hủy đơn hàng ở trạng thái ${order.status}. Chỉ có thể hủy đơn hàng ở trạng thái PENDING hoặc CONFIRMED.`,
      );
    }

    const cancelledOrder = await this.prisma.$transaction(async (tx) => {

      for (const item of order.items) {
        if (item.optionId) {
          await tx.productOption.update({
            where: { optionId: item.optionId },
            data: {
              stockQuantity: {
                increment: item.quantity,
              },
            },
          });
        }
      }


      const updatedOrder = await tx.order.update({
        where: { orderId },
        data: { status: OrderStatus.CANCELLED },
        select: orderSelect,
      });

      return updatedOrder;
    });

    return cancelledOrder;
  }
}
