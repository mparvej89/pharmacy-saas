import { IsNotEmpty, IsString, IsEmail, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ example: 'Apollo Pharmacy Koramangala' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'APOLLO-KOR' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'KA-B2-123456' })
  @IsString()
  @IsNotEmpty()
  drugLicenseNumber!: string;

  @ApiProperty({ example: '29ABCDE1234F1Z5' })
  @IsString()
  @IsNotEmpty()
  @Length(15, 15)
  gstin!: string;

  @ApiProperty({ example: '100 Feet Road, 4th Block, Koramangala' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiProperty({ example: '29' })
  @IsString()
  @Length(2, 2)
  stateCode!: string;

  @ApiProperty({ example: '560034' })
  @IsString()
  @IsNotEmpty()
  pincode!: string;

  @ApiProperty({ example: '+91 98765 43210' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'koramangala@apollopharmacy.local' })
  @IsEmail()
  email!: string;
}

export class UpdateStoreDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  drugLicenseNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}
