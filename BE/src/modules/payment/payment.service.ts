import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { paymentSelect } from './utils/payment-select.util';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
    OrderStatus,
    PaymentStatus,
    UserRole,
} from 'src/generated/prisma/enums';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class PaymentService {
    constructor(private prisma: PrismaService) { }

    async getPaymentById(
        paymentId: string,
        userId: string,
        userRole: string,
    ) {
        const payment = await this.prisma.payment.findUnique({
            where: { paymentId },
            select: paymentSelect,
        });

        if (!payment) {
            throw new NotFoundException('Thanh toán không tồn tại');
        }

        if (
            userRole === UserRole.CUSTOMER &&
            payment.order.userId !== userId
        ) {
            throw new NotFoundException('Thanh toán không tồn tại');
        }

        return payment;
    }

    async getPaymentsByOrderId(
        orderId: string,
        userId: string,
        userRole: string,
    ) {
        const order = await this.prisma.order.findUnique({
            where: { orderId },
            select: { userId: true },
        });

        if (!order) {
            throw new NotFoundException('Đơn hàng không tồn tại');
        }

        if (userRole === UserRole.CUSTOMER && order.userId !== userId) {
            throw new NotFoundException('Đơn hàng không tồn tại');
        }

        const payments = await this.prisma.payment.findMany({
            where: { orderId },
            select: paymentSelect,
            orderBy: {
                createdAt: 'desc',
            },
        });

        return payments;
    }

    async getAllPayments(
        userId: string,
        userRole: string,
        page: number = 1,
        limit: number = 12,
        paymentStatus?: PaymentStatus,
        orderId?: string,
    ) {
        const skip = (page - 1) * limit;

        const where: Prisma.PaymentWhereInput = {
            ...(paymentStatus && { paymentStatus }),
            ...(orderId && { orderId }),
            ...(userRole === UserRole.CUSTOMER && {
                order: {
                    userId,
                },
            }),
        };

        const [payments, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                skip,
                take: limit,
                select: paymentSelect,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.payment.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            payments,
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

    async updatePaymentStatus(
        paymentId: string,
        userId: string,
        userRole: string,
        data: UpdatePaymentDto,
    ) {
        const payment = await this.prisma.payment.findUnique({
            where: { paymentId },
            select: {
                paymentId: true,
                orderId: true,
                paymentStatus: true,
                order: {
                    select: {
                        userId: true,
                        status: true,
                    },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException('Thanh toán không tồn tại');
        }
        if (
            userRole === UserRole.CUSTOMER &&
            payment.order.userId !== userId
        ) {
            throw new NotFoundException('Thanh toán không tồn tại');
        }

        if (payment.paymentStatus === PaymentStatus.REFUNDED) {
            throw new BadRequestException(
                'Không thể thay đổi trạng thái thanh toán đã được hoàn tiền',
            );
        }

        if (data.paymentStatus === PaymentStatus.PAID) {
            if (
                payment.order.status === OrderStatus.CANCELLED ||
                payment.order.status === OrderStatus.REFUNDED
            ) {
                throw new BadRequestException(
                    'Không thể thanh toán cho đơn hàng đã bị hủy hoặc hoàn tiền',
                );
            }
        }

        const updatedPayment = await this.prisma.payment.update({
            where: { paymentId },
            data: { paymentStatus: data.paymentStatus },
            select: paymentSelect,
        });

        return updatedPayment;
    }
}

