import { PartialType } from '@nestjs/mapped-types';
import { CreateProductOptionDto } from './create-product-option.dto';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateProductOptionDto extends PartialType(CreateProductOptionDto) {
    @IsUUID()
    @IsOptional()
    optionId?: string;
  }

