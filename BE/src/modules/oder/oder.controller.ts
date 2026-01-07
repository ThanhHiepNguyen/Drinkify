import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OderService } from './oder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOderDto } from './dto/create-oder.dto';
import { OrderStatus } from 'src/generated/prisma/enums';
import { UpdateOderDto } from './dto/update-oder.dto';

@Controller('oder')
export class OderController {
  constructor(private readonly oderService: OderService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllOrders(
    @Req() req: { user: { userId: string; role: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrderStatus,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 12;

    if (pageNum < 1) {
      throw new BadRequestException('Trang phải lớn hơn 0');
    }

    if (limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Số lượng mỗi trang phải từ 1 đến 100');
    }

    const result = await this.oderService.getAllOrders(
      req.user.userId,
      req.user.role,
      pageNum,
      limitNum,
      status,
    );

    return {
      message: 'Lấy danh sách đơn hàng thành công',
      ...result,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @Body() body: CreateOderDto,
    @Req() req: { user: { userId: string } },
  ) {
    const order = await this.oderService.createOder(req.user.userId, body);

    return {
      message: 'Tạo đơn hàng thành công',
      order,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOrderById(
    @Param('id') orderId: string,
    @Req() req: { user: { userId: string; role: string } },
  ) {
    const order = await this.oderService.getOrderById(
      orderId,
      req.user.userId,
      req.user.role,
    );

    return {
      message: 'Lấy thông tin đơn hàng thành công',
      order,
    };
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateOderStatus(
    @Param('id') orderId: string,
    @Body() data: UpdateOderDto,
    @Req() req: { user: { userId: string; role: string } },
  ) {
    const order = await this.oderService.updateOderStatus(
      orderId,
      req.user.userId,
      req.user.role,
      data,
    );
    return {
      message: 'Cập nhật trạng thái đơn hàng thành công',
      order,
    };
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(
    @Param('id') orderId: string,
    @Req() req: { user: { userId: string; role: string } },
  ) {
    const order = await this.oderService.cancelOrder(
      orderId,
      req.user.userId,
      req.user.role,
    );
    return {
      message: 'Hủy đơn hàng thành công',
      order,
    };
  }
}

