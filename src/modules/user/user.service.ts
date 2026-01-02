import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import bcrypt from 'bcrypt';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { sendOtpEmail } from './utils/email.util';
import { getAllUserDto } from './dto/getall-user.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';


@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async createUser(data: CreateUserDto) {
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('Email này đã được đăng ký');
    }

    if (data.phone) {
      const existingUserByPhone = await this.prisma.user.findUnique({
        where: { phone: data.phone },
      });

      if (existingUserByPhone) {
        throw new ConflictException('Số điện thoại này đã được đăng ký');
      }
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        phone: data.phone,
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }


  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    return user;
  }

  async updateProfile(userId: string, data: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User không tồn tại');
    }


    const updatedUser = await this.prisma.user.update({
      where: { userId },
      data: {
        fullName: data.fullName,
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }
    const isMatch = await bcrypt.compare(data.oldPassword, user.passwordHash);

    if (!isMatch) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }
    if (data.newPassword !== data.confirmPassword) {
      throw new BadRequestException('Vui lòng nhập mật khẩu xác nhận chính xác')
    }
    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    const updateUserPassword = await this.prisma.user.update({
      where: { userId },
      data: {
        passwordHash: passwordHash
      }
    })
    return updateUserPassword;

  }
  async requestPasswordReset(data: RequestPasswordResetDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new NotFoundException('Nếu email tồn tại, mã khôi phục đã được gửi!')
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

    const resetPasswordExpires = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires,
      },
    });

    const emailSent = await sendOtpEmail(data.email, resetToken);

    if (!emailSent) {
      throw new BadRequestException('Không thể gửi OTP. Vui lòng thử lại sau.');
    }

    return {
      message: 'Đã tạo mã OTP. Vui lòng kiểm tra email',
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    };
  }

  async verifyOtp(data: VerifyOtpDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: data.email,
        resetPasswordToken: data.otp,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Mã OTP không đúng hoặc đã hết hạn');
    }

    return {
      message: 'Mã OTP hợp lệ',
    };
  }

  async resetPassword(data: ResetPasswordDto) {
    const whereClause: any = {
      resetPasswordToken: data.token,
      resetPasswordExpires: {
        gt: new Date(),
      },
    };

    if (data.email) {
      whereClause.email = data.email;
    }

    const user = await this.prisma.user.findFirst({
      where: whereClause,
    });

    if (!user) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return {
      message: 'Đổi mật khẩu thành công',
    };
  }

  async getAllUsers(query: getAllUserDto) {
    const { page, limit, search, role, isActive } = query;


    const currentPage = page ?? 1;
    const currentLimit = limit ?? 12;

    const skip = (currentPage - 1) * currentLimit;

    const where: any = {};

    if (role) {
      where.role = role;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    // serach thoe mail, sdt, fullName
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' as const } },
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: currentLimit,
        select: {
          userId: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / currentLimit);

    return {
      data: users,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    };
  }

  async createUserByAdmin(data: AdminCreateUserDto) {
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('Email này đã được đăng ký');
    }

    const existingUserByPhone = await this.prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existingUserByPhone) {
      throw new ConflictException('Số điện thoại này đã được đăng ký');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role || 'CUSTOMER',
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updateUserByAdmin(userId: string, data: AdminUpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User không tồn tại');
    }

    const updatedUser = await this.prisma.user.update({
      where: { userId },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async toggleUserStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    const updatedUser = await this.prisma.user.update({
      where: { userId },
      data: {
        isActive: !user.isActive,
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

}
