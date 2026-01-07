import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

@Controller('review')
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async createReview(
        @Body() data: CreateReviewDto,
        @Req() req: { user: { userId: string } },
    ) {
        const review = await this.reviewService.createReview(
            req.user.userId,
            data,
        );

        return {
            message: 'Tạo đánh giá thành công',
            review,
        };
    }

    @Get('product/:productId')
    async getReviewsByProductId(
        @Param('productId') productId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('rating') rating?: string,
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 12;
        const ratingNum = rating ? parseInt(rating, 10) : undefined;

        if (pageNum < 1) {
            throw new BadRequestException('Trang phải lớn hơn 0');
        }

        if (limitNum < 1 || limitNum > 100) {
            throw new BadRequestException('Số lượng mỗi trang phải từ 1 đến 100');
        }

        if (ratingNum && (ratingNum < 1 || ratingNum > 5)) {
            throw new BadRequestException('Đánh giá phải từ 1 đến 5 sao');
        }

        const result = await this.reviewService.getReviewsByProductId(
            productId,
            pageNum,
            limitNum,
            ratingNum,
        );

        return {
            message: 'Lấy danh sách đánh giá theo sản phẩm thành công',
            ...result,
        };
    }

    @Get('user/:userId')
    async getReviewsByUserId(
        @Param('userId') userId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 12;

        if (pageNum < 1) {
            throw new BadRequestException('Trang phải lớn hơn 0');
        }

        if (limitNum < 1 || limitNum > 100) {
            throw new BadRequestException('Số lượng mỗi trang phải từ 1 đến 100');
        }

        const result = await this.reviewService.getReviewsByUserId(
            userId,
            pageNum,
            limitNum,
        );

        return {
            message: 'Lấy danh sách đánh giá theo người dùng thành công',
            ...result,
        };
    }

    @Get(':id')
    async getReviewById(@Param('id') reviewId: string) {
        const review = await this.reviewService.getReviewById(reviewId);

        return {
            message: 'Lấy thông tin đánh giá thành công',
            review,
        };
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    async updateReview(
        @Param('id') reviewId: string,
        @Body() data: UpdateReviewDto,
        @Req() req: { user: { userId: string; role: string } },
    ) {
        const review = await this.reviewService.updateReview(
            reviewId,
            req.user.userId,
            req.user.role,
            data,
        );

        return {
            message: 'Cập nhật đánh giá thành công',
            review,
        };
    }

    @Patch(':id/reply')
    @UseGuards(JwtAuthGuard)
    async replyToReview(
        @Param('id') reviewId: string,
        @Body() data: ReplyReviewDto,
        @Req() req: { user: { userId: string; role: string } },
    ) {
        const review = await this.reviewService.replyToReview(
            reviewId,
            req.user.userId,
            req.user.role,
            data,
        );

        return {
            message: 'Phản hồi đánh giá thành công',
            review,
        };
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async deleteReview(
        @Param('id') reviewId: string,
        @Req() req: { user: { userId: string; role: string } },
    ) {
        const result = await this.reviewService.deleteReview(
            reviewId,
            req.user.userId,
            req.user.role,
        );

        return result;
    }
}

