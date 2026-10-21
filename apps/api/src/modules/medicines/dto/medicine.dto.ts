import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DosageForm, PrescriptionCategory } from '@prisma/client';

export class CreateMedicineDto {
  @ApiProperty({ example: 'Paracetamol 650mg' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Paracetamol' })
  @IsString()
  @IsNotEmpty()
  genericName!: string;

  @ApiProperty({ example: 'Dolo 650', required: false })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiProperty({ example: 'Micro Labs Ltd', required: false })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty({ example: 'Paracetamol IP 650mg', required: false })
  @IsOptional()
  @IsString()
  composition?: string;

  @ApiProperty({ enum: DosageForm, default: DosageForm.TABLET })
  @IsEnum(DosageForm)
  dosageForm!: DosageForm;

  @ApiProperty({ example: 15, default: 10 })
  @IsInt()
  @Min(1)
  packSize!: number;

  @ApiProperty({ example: 'STRIP', default: 'STRIP' })
  @IsString()
  unitOfMeasure!: string;

  @ApiProperty({ example: '3004', default: '3004' })
  @IsString()
  hsnCode!: string;

  @ApiProperty({ example: 12.0, default: 12.0 })
  @IsNumber()
  gstRate!: number;

  @ApiProperty({ enum: PrescriptionCategory, default: PrescriptionCategory.OTC })
  @IsEnum(PrescriptionCategory)
  prescriptionCategory!: PrescriptionCategory;

  @ApiProperty({ example: '8901234567890', required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 'MED-DOLO-650', required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 30, default: 20 })
  @IsInt()
  @Min(0)
  reorderLevel!: number;

  @ApiProperty({ example: 25.50 })
  @IsNumber()
  @Min(0)
  purchaseCost!: number;

  @ApiProperty({ example: 32.00 })
  @IsNumber()
  @Min(0)
  sellingPrice!: number;

  @ApiProperty({ example: 35.00 })
  @IsNumber()
  @Min(0)
  mrp!: number;
}

export class UpdateMedicineDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  genericName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  composition?: string;

  @ApiProperty({ enum: DosageForm, required: false })
  @IsOptional()
  @IsEnum(DosageForm)
  dosageForm?: DosageForm;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  packSize?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  gstRate?: number;

  @ApiProperty({ enum: PrescriptionCategory, required: false })
  @IsOptional()
  @IsEnum(PrescriptionCategory)
  prescriptionCategory?: PrescriptionCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  purchaseCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sellingPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  mrp?: number;
}

export class CheckDuplicateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  excludeId?: string;
}
