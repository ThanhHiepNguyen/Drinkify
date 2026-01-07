import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateProductOptionDto {
    @IsString()
    size: string;
    @IsString()
    @IsOptional()
    material?: string;
    @IsString()
    @IsOptional()
    threadType?: string;
    @IsString()
    @IsOptional()
    headType?: string;
    @IsNumber()
    @Min(0)
    price: number;
    @IsNumber()
    @IsOptional()
    @Min(0)
    salePrice?: number;
    @IsNumber()
    @IsOptional()
    @Min(0)
    discountPercent?: number;
    @IsInt()
    @Min(0)
    stockQuantity: number;
    @IsString()
    @IsOptional()
    unit?: string;
    @IsString()
    @IsOptional()
    image?: string;
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}