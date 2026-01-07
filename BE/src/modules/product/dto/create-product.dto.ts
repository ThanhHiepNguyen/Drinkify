import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { CreateProductOptionDto } from "./create-product-option.dto";
import { Type } from "class-transformer";

export class CreateProductDto {

    @IsString()
    @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
    name: string;
    @IsString()
    @IsNotEmpty({ message: 'Mô tả sản phẩm không được để trống' })
    description: string;
    @IsUUID()
    categoryId: string;
    @IsString()
    @IsOptional()
    thumbnail?: string;
    @IsArray()
    @IsNotEmpty({ message: 'Các tùy chọn sản phẩm không được để trống' })
    @ValidateNested({ each: true })
    @Type(() => CreateProductOptionDto)
    options: CreateProductOptionDto[];

}
