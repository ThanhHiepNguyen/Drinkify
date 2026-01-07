import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../../prisma.service';
import { createToken } from './utils/token.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) { }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.userService.createUser({
      email: registerDto.email,
      passwordHash: hashedPassword,
      fullName: registerDto.fullName,
      phone: registerDto.phone,
    });

    const accessToken = createToken(this.jwtService, {
      userId: user.userId,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      message: 'Đăng ký thành công',
    };
  }


  async login(loginDto: LoginDto) {
    const whereCondition: any = {};

    if (loginDto.email) {
      whereCondition.email = loginDto.email;
    } else if (loginDto.phone) {
      whereCondition.phone = loginDto.phone;
    } else {
      throw new UnauthorizedException('Vui lòng nhập email hoặc số điện thoại');
    }

    const user = await this.prisma.user.findFirst({
      where: whereCondition,
      select: {
        userId: true,
        email: true,
        passwordHash: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email/Số điện thoại hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email/Số điện thoại hoặc mật khẩu không đúng');
    }

    const accessToken = createToken(this.jwtService, {
      userId: user.userId,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      message: 'Đăng nhập thành công',
    };
  }


}
