import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { reviewSelect } from './utils/review-select.util';
import { OrderStatus, UserRole } from 'src/generated/prisma/enums';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class ReviewService {
    constructor(private prisma: PrismaService) { }

    async createReview(userId: string, data: CreateReviewDto) {
        const product = await this.prisma.product.findUnique({
            where: { productId: data.productId },
            select: { productId: true, name: true },
        });

        if (!product) {
            throw new NotFoundException('Sản phẩm không tồn tại');
        }

        const hasPurchased = await this.prisma.orderItem.findFirst({
            where: {
                productId: data.productId,
                order: {
                    userId,
                    status: OrderStatus.DELIVERED,
                },
            },
        });

        if (!hasPurchased) {
            throw new BadRequestException(
                'Bạn cần mua và nhận được sản phẩm trước khi đánh giá',
            );
        }


        const existingReview = await this.prisma.review.findUnique({
            where: {
                productId_userId: {
                    productId: data.productId,
                    userId,
                },
            },
        });

        if (existingReview) {
            throw new BadRequestException('Bạn đã đánh giá sản phẩm này rồi');
        }

        const review = await this.prisma.review.create({
            data: {
                productId: data.productId,
                userId,
                rating: data.rating,
                comment: data.comment,
            },
            select: reviewSelect,
        });

        return review;
    }

    async getReviewById(reviewId: string) {
        const review = await this.prisma.review.findUnique({
            where: { reviewId },
            select: reviewSelect,
        });

        if (!review) {
            throw new NotFoundException('Đánh giá không tồn tại');
        }

        return review;
    }

    async getReviewsByProductId(
        productId: string,
        page: number = 1,
        limit: number = 12,
        rating?: number,
    ) {
        const skip = (page - 1) * limit;


        const product = await this.prisma.product.findUnique({
            where: { productId },
            select: { productId: true },
        });

        if (!product) {
            throw new NotFoundException('Sản phẩm không tồn tại');
        }

        const where: Prisma.ReviewWhereInput = {
            productId,
            ...(rating && { rating }),
        };

        const [reviews, total] = await Promise.all([
            this.prisma.review.findMany({
                where,
                skip,
                take: limit,
                select: reviewSelect,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.review.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);


        const ratingStats = await this.prisma.review.aggregate({
            where: { productId },
            _avg: {
                rating: true,
            },
            _count: {
                rating: true,
            },
        });

        return {
            reviews,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
            ratingStats: {
                averageRating: ratingStats._avg.rating || 0,
                totalReviews: ratingStats._count.rating,
            },
        };
    }

    async getReviewsByUserId(
        userId: string,
        page: number = 1,
        limit: number = 12,
    ) {
        const skip = (page - 1) * limit;

        const where: Prisma.ReviewWhereInput = {
            userId,
        };

        const [reviews, total] = await Promise.all([
            this.prisma.review.findMany({
                where,
                skip,
                take: limit,
                select: reviewSelect,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.review.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            reviews,
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

    async updateReview(
        reviewId: string,
        userId: string,
        userRole: string,
        data: UpdateReviewDto,
    ) {
        const review = await this.prisma.review.findUnique({
            where: { reviewId },
            select: {
                reviewId: true,
                userId: true,
                rating: true,
            },
        });

        if (!review) {
            throw new NotFoundException('Đánh giá không tồn tại');
        }


        if (userRole !== UserRole.ADMIN && review.userId !== userId) {
            throw new NotFoundException('Đánh giá không tồn tại');
        }

        if (data.rating !== undefined) {

            if (review.rating === 5) {
                throw new BadRequestException(
                    'Không thể cập nhật đánh giá 5 sao. Bạn chỉ có thể cập nhật đánh giá thấp hơn 5 sao.',
                );
            }

            if (data.rating < review.rating) {
                throw new BadRequestException(
                    `Không thể giảm đánh giá từ ${review.rating} sao xuống ${data.rating} sao. Bạn chỉ có thể tăng đánh giá.`,
                );
            }
        }

        const updatedReview = await this.prisma.review.update({
            where: { reviewId },
            data: {
                ...(data.rating && { rating: data.rating }),
                ...(data.comment !== undefined && { comment: data.comment }),
            },
            select: reviewSelect,
        });

        return updatedReview;
    }

    async replyToReview(
        reviewId: string,
        userId: string,
        userRole: string,
        data: ReplyReviewDto,
    ) {

        if (userRole !== UserRole.ADMIN && userRole !== UserRole.STAFF) {
            throw new BadRequestException(
                'Chỉ admin và staff mới được phản hồi đánh giá',
            );
        }

        const review = await this.prisma.review.findUnique({
            where: { reviewId },
            select: {
                reviewId: true,
            },
        });

        if (!review) {
            throw new NotFoundException('Đánh giá không tồn tại');
        }

        const updatedReview = await this.prisma.review.update({
            where: { reviewId },
            data: {
                reply: data.reply,
                repliedBy: userId,
                repliedAt: new Date(),
            },
            select: reviewSelect,
        });

        return updatedReview;
    }

    async deleteReview(reviewId: string, userId: string, userRole: string) {
        const review = await this.prisma.review.findUnique({
            where: { reviewId },
            select: {
                reviewId: true,
                userId: true,
            },
        });

        if (!review) {
            throw new NotFoundException('Đánh giá không tồn tại');
        }


        if (userRole !== UserRole.ADMIN && review.userId !== userId) {
            throw new NotFoundException('Đánh giá không tồn tại');
        }

        await this.prisma.review.delete({
            where: { reviewId },
        });

        return {
            message: 'Xóa đánh giá thành công',
        };
    }
}

