import { IsEnum, IsNotEmpty } from 'class-validator';
import { PaymentStatus } from 'src/generated/prisma/enums';

export class UpdatePaymentDto {
    @IsEnum(PaymentStatus, { message: 'Trạng thái thanh toán không hợp lệ' })
    @IsNotEmpty({ message: 'Trạng thái thanh toán không được để trống' })
    paymentStatus: PaymentStatus;
}

