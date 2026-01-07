import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from 'src/generated/prisma/enums';

export class UpdateOderDto {
    @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
    @IsNotEmpty({ message: 'Trạng thái đơn hàng không được để trống' })
    status: OrderStatus;
}
