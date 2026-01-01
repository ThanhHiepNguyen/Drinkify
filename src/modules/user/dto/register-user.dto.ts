import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;

    @IsString()
    @MinLength(6, { message: 'Password phải có ít nhất 6 ký tự' })
    password: string;
    @IsString()
    fullName?: string;
    @IsString()
    phone?: string;
}


