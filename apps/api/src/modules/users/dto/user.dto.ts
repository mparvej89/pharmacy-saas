import { IsEmail, IsNotEmpty, IsString, IsEnum, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'pharmacist@apollopharmacy.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Suresh Raina' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: '+91 98765 11223', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.PHARMACIST })
  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;
}
