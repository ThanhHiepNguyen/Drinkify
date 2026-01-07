import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mã OTP' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsOptional()
  email?: string;
}

