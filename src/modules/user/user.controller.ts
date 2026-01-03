import { Controller, Get, Put, Post, Body, UseGuards, Request, Query, Param, Patch } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { getAllUserDto } from './dto/getall-user.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: { user: { userId: string } }) {
    const user = await this.userService.getProfile(req.user.userId);
    return {
      user,
      message: 'Lấy thông tin profile thành công',
    };
  }

  @Get()
  @UseGuards(AdminGuard)
  async getAllUsers(@Query() query: getAllUserDto) {
    return await this.userService.getAllUsers(query);
  }

  @Post()
  @UseGuards(AdminGuard)
  async createUser(@Body() adminCreateUserDto: AdminCreateUserDto) {
    const user = await this.userService.createUserByAdmin(adminCreateUserDto);
    return {
      user,
      message: 'Tạo user thành công',
    };
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async getUserById(@Param('id') userId: string) {
    const user = await this.userService.findById(userId);
    return {
      user,
      message: 'Lấy thông tin user thành công',
    };
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async updateUser(@Param('id') userId: string, @Body() adminUpdateUserDto: AdminUpdateUserDto) {
    const user = await this.userService.updateUserByAdmin(userId, adminUpdateUserDto);
    return {
      user,
      message: 'Cập nhật user thành công',
    };
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  async toggleUserStatus(@Param('id') userId: string) {
    const user = await this.userService.toggleUserStatus(userId);
    return {
      user,
      message: user.isActive ? 'Kích hoạt user thành công' : 'Khóa tài khoản thành công',
    };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req: { user: { userId: string } }, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.userService.updateProfile(
      req.user.userId,
      updateUserDto,
    );

    return {
      user: updatedUser,
      message: 'Cập nhật profile thành công',
    };
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req: { user: { userId: string } }, @Body() changePasswordDto: ChangePasswordDto) {
    await this.userService.changePassword(
      req.user.userId,
      changePasswordDto,
    );

    return {
      message: 'Cập nhật mật khẩu thành công',
    };
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    return await this.userService.requestPasswordReset(requestPasswordResetDto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return await this.userService.verifyOtp(verifyOtpDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.userService.resetPassword(resetPasswordDto);
  }
}
