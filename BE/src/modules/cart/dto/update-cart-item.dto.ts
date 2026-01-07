import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCartItemDto {
    @IsInt()
    @Min(1, { message: 'Số lượng phải lớn hơn 0' })
    @IsOptional()
    quantity?: number;
}

