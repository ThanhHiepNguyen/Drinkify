import { IsString, ValidateIf, IsEmail } from 'class-validator';

export class LoginDto {
    @ValidateIf((o) => !o.phone)
    @IsString({ message: 'Email hoặc số điện thoại là bắt buộc' })
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email?: string;
    @ValidateIf((o) => !o.email)
    @IsString({ message: 'Email hoặc số điện thoại là bắt buộc' })
    phone?: string;
    @IsString()
    password: string;
}

