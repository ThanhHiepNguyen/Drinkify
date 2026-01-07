import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password phải có ít nhất 6 ký tự' })
  password: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  phone: string;
}

