import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsUUID,
    Min,
} from 'class-validator';

export class AddCartItemDto {
    @IsUUID()
    @IsNotEmpty({ message: 'ID sản phẩm không được để trống' })
    productId: string;

    @IsUUID()
    @IsOptional()
    optionId?: string;

    @IsInt()
    @Min(1, { message: 'Số lượng phải lớn hơn 0' })
    @IsNotEmpty({ message: 'Số lượng không được để trống' })
    quantity: number;
}

