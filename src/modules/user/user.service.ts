
import { Injectable, ConflictException } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { PrismaService } from '../../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async create(RegisterUserDto: RegisterUserDto) {

    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: RegisterUserDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('Email này đã được đăng ký');
    }

    const existingUserByPhone = await this.prisma.user.findUnique({
      where: { phone: RegisterUserDto.phone },
    });

    if (existingUserByPhone) {
      throw new ConflictException('Số điện thoại này đã được đăng ký');
    }

    const hashedPassword = await bcrypt.hash(RegisterUserDto.password, 10);

    // Tạo user mới
    const user = await this.prisma.user.create({
      data: {
        email: RegisterUserDto.email,
        passwordHash: hashedPassword,
        fullName: RegisterUserDto.fullName,
        phone: RegisterUserDto.phone,
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
}
