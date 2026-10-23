import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class SaleLineItemDto {
  @ApiProperty({ example: 'medicine-uuid' })
  @IsString()
  @IsNotEmpty()
  medicineId!: string;

  @ApiProperty({
    example: 'batch-uuid',
    required: false,
    description: 'Optional manual batch selection; if omitted, FEFO allocates automatically',
  })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 'STRIP', required: false, default: 'STRIP' })
  @IsOptional()
  @IsString()
  saleUnit?: string;

  @ApiProperty({ example: 10, required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  conversionFactor?: number;

  @ApiProperty({ example: 13.00, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({ example: 0.0, default: 0.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;
}

export class PaymentSplitDto {
  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({ example: 100.00 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: 'UPI-TXN-987654321', required: false })
  @IsOptional()
  @IsString()
  referenceNumber?: string;
}

export class CreateSaleDto {
  @ApiProperty({
    example: 'idemp-pos-term1-987654321',
    description: 'Unique client-generated idempotency key to prevent double checkout',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @ApiProperty({ example: 'Ramesh Patel', required: false })
  @IsOptional()
  @IsString()
  patientName?: string;

  @ApiProperty({ example: '+91 98765 00000', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ example: 'Dr. S. K. Sharma', required: false })
  @IsOptional()
  @IsString()
  doctorName?: string;

  @ApiProperty({ example: 'MCI-12345', required: false })
  @IsOptional()
  @IsString()
  doctorRegNo?: string;

  @ApiProperty({ example: 0.0, default: 0.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  billDiscountPercent?: number;

  @ApiProperty({ type: [SaleLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineItemDto)
  items!: SaleLineItemDto[];

  @ApiProperty({ type: [PaymentSplitDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentSplitDto)
  payments!: PaymentSplitDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
