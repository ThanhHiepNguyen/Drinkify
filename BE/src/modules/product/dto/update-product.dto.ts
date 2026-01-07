import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateProductOptionDto } from './update-product-option.dto';

export class UpdateProductDto extends PartialType(
    OmitType(CreateProductDto, ['options'] as const)
) {
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UpdateProductOptionDto)
    options?: UpdateProductOptionDto[];
}