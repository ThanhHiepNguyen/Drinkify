import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  @IsNotEmpty({ message: 'ID sản phẩm không được để trống' })
  productId: string;

  @IsInt()
  @Min(1, { message: 'Đánh giá phải từ 1 đến 5 sao' })
  @Max(5, { message: 'Đánh giá phải từ 1 đến 5 sao' })
  @IsNotEmpty({ message: 'Đánh giá không được để trống' })
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

