import { IsOptional, IsString, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums';

export class AdminUpdateUserDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    fullName?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    address?: string;
}

