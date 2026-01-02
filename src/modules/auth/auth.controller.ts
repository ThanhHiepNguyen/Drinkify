import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { getCookieOptions, getClearCookieOptions } from './utils/cookie.util';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(registerDto);

    res.cookie('accessToken', result.accessToken, getCookieOptions());

    return res.json({
      accessToken: result.accessToken,
      message: result.message,
    });
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(loginDto);

    res.cookie('accessToken', result.accessToken, getCookieOptions());

    return res.json({
      accessToken: result.accessToken,
      message: result.message,
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Res() res: Response) {
    res.clearCookie('accessToken', getClearCookieOptions());
    return res.json({
      message: 'Đăng xuất thành công',
    });
  }
}
