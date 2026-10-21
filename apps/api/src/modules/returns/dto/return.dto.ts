import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, ReturnDisposition } from '@prisma/client';

export class ReturnItemLineDto {
  @ApiProperty({ example: 'sale-item-uuid' })
  @IsString()
  @IsNotEmpty()
  saleItemId!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateSaleReturnDto {
  @ApiProperty({ example: 'sale-uuid' })
  @IsString()
  @IsNotEmpty()
  saleId!: string;

  @ApiProperty({ example: 'Wrong dosage requested by patient' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  refundMethod!: PaymentMethod;

  @ApiProperty({ type: [ReturnItemLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemLineDto)
  items!: ReturnItemLineDto[];
}

export class InspectReturnItemDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  approveToSellable!: boolean; // If true, moves to AVAILABLE; if false, moves to DAMAGED_DISPOSAL

  @ApiProperty({ example: 'Packaging intact, unpunctured blister foil, verified batch' })
  @IsString()
  @IsNotEmpty()
  inspectionNotes!: string;
}
