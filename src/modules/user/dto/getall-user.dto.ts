
import { Type } from 'class-transformer'; import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
export class getAllUserDto {

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  role?: string;
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}