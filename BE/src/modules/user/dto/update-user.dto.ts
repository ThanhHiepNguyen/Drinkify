import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    @MaxLength(100)
    fullName?: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    address?: string;
}
