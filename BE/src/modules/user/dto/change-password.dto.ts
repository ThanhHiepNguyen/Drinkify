import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
    @IsString()
    @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu cũ' })
    oldPassword: string;

    @IsString()
    @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới' })
    @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
    newPassword: string;

    @IsString()
    @IsNotEmpty({ message: 'Vui lòng xác nhận mật khẩu' })
    @MinLength(6, { message: 'Mật khẩu xác nhận phải có ít nhất 6 ký tự' })
    confirmPassword: string;
}