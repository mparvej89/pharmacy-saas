import { IsNotEmpty, IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Sunil Verma' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '+91 98765 43210' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'sunil@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Dr. Ramesh Sharma', required: false })
  @IsOptional()
  @IsString()
  doctorName?: string;

  @ApiProperty({ example: 'MCI-19482', required: false })
  @IsOptional()
  @IsString()
  doctorRegNo?: string;
}

export class UpdateCustomerDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  doctorName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  doctorRegNo?: string;
}
