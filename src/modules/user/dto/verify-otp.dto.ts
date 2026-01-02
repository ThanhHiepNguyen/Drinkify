import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyOtpDto {
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @IsNotEmpty({ message: 'Vui lòng nhập email' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Vui lòng nhập mã OTP' })
    otp: string;
}

