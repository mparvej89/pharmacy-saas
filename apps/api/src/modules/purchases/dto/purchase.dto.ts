import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseItemDto {
  @ApiProperty({ example: 'medicine-uuid' })
  @IsString()
  @IsNotEmpty()
  medicineId!: string;

  @ApiProperty({ example: 'BATCH-2026-X1' })
  @IsString()
  @IsNotEmpty()
  batchNumber!: string;

  @ApiProperty({ example: '2028-06-30' })
  @IsDateString()
  expiryDate!: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 10, default: 0 })
  @IsInt()
  @Min(0)
  freeQuantity!: number;

  @ApiProperty({ example: 45.00 })
  @IsNumber()
  @Min(0)
  purchaseRate!: number;

  @ApiProperty({ example: 5.0, default: 0.0 })
  @IsNumber()
  @Min(0)
  discountPercent!: number;

  @ApiProperty({ example: 12.0, default: 12.0 })
  @IsNumber()
  @Min(0)
  gstRate!: number;

  @ApiProperty({ example: 65.00 })
  @IsNumber()
  @Min(0)
  mrp!: number;

  @ApiProperty({ example: 60.00 })
  @IsNumber()
  @Min(0)
  sellingPrice!: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ example: 'supplier-uuid' })
  @IsString()
  @IsNotEmpty()
  supplierId!: string;

  @ApiProperty({ example: 'INV-SUP-2026-889' })
  @IsString()
  @IsNotEmpty()
  supplierInvoiceNumber!: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  supplierInvoiceDate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}
