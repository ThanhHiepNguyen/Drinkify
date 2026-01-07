import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from 'src/generated/prisma/enums';

export class CreateOderDto {
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ giao hàng không được để trống' })
  shippingAddress: string;

  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  @IsNotEmpty({ message: 'Phương thức thanh toán không được để trống' })
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  note?: string;
}
