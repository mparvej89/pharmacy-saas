import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@apollopharmacy.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class SelectStoreDto {
  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  @IsNotEmpty()
  storeId!: string;
}
