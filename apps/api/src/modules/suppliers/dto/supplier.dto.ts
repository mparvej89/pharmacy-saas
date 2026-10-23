import { IsNotEmpty, IsString, IsOptional, IsEmail, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'MedLife Distributors Pvt Ltd' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Rajesh Kumar', required: false })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({ example: '+91 98450 12345' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'orders@medlife.local', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '29AABCM1234F1Z8', required: false })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiProperty({ example: 'KA-B2-SUP-9876', required: false })
  @IsOptional()
  @IsString()
  dlNumber?: string;

  @ApiProperty({ example: 'Industrial Area, Peenya', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Bengaluru', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Karnataka', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: '560058', required: false })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiProperty({ example: 30, default: 30, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  paymentTermsDays?: number = 30;
}

export class UpdateSupplierDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactPerson?: string;

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
  gstin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dlNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  paymentTermsDays?: number;
}

export class RecordSupplierPaymentDto {
  @ApiProperty({ example: 5000.0 })
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({ example: 'BANK_TRANSFER', enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'] })
  @IsNotEmpty()
  @IsString()
  paymentMethod!: string;

  @ApiProperty({ example: 'CHQ-982134 / UTR-49120', required: false })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty({ example: 'Payment against Invoice INV-SUP-2026-01', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
