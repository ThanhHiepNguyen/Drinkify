import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentStatus } from 'src/generated/prisma/enums';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllPayments(
    @Req() req: { user: { userId: string; role: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: PaymentStatus,
    @Query('orderId') orderId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 12;

    if (pageNum < 1) {
      throw new BadRequestException('Trang phải lớn hơn 0');
    }

    if (limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Số lượng mỗi trang phải từ 1 đến 100');
    }

    const result = await this.paymentService.getAllPayments(
      req.user.userId,
      req.user.role,
      pageNum,
      limitNum,
      status,
      orderId,
    );

    return {
      message: 'Lấy danh sách thanh toán thành công',
      ...result,
    };
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  async getPaymentsByOrderId(
    @Param('orderId') orderId: string,
    @Req() req: { user: { userId: string; role: string } },
  ) {
    const payments = await this.paymentService.getPaymentsByOrderId(
      orderId,
      req.user.userId,
      req.user.role,
    );

    return {
      message: 'Lấy danh sách thanh toán theo đơn hàng thành công',
      payments,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPaymentById(
    @Param('id') paymentId: string,
    @Req() req: { user: { userId: string; role: string } },
  ) {
    const payment = await this.paymentService.getPaymentById(
      paymentId,
      req.user.userId,
      req.user.role,
    );

    return {
      message: 'Lấy thông tin thanh toán thành công',
      payment,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updatePaymentStatus(
    @Param('id') paymentId: string,
    @Body() data: UpdatePaymentDto,
    @Req() req: { user: { userId: string; role: string } },
  ) {
    const payment = await this.paymentService.updatePaymentStatus(
      paymentId,
      req.user.userId,
      req.user.role,
      data,
    );

    return {
      message: 'Cập nhật trạng thái thanh toán thành công',
      payment,
    };
  }
}

