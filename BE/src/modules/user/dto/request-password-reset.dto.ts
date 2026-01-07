import { IsEmail, IsNotEmpty } from "class-validator";

export class RequestPasswordResetDto {
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @IsNotEmpty({ message: 'Vui lòng nhập email' })
    email: string;
}