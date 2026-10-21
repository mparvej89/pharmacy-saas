import { IsNotEmpty, IsString, IsEnum, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdjustmentType } from '@prisma/client';

export class CreateAdjustmentDto {
  @ApiProperty({ example: 'medicine-uuid' })
  @IsString()
  @IsNotEmpty()
  medicineId!: string;

  @ApiProperty({ example: 'batch-uuid' })
  @IsString()
  @IsNotEmpty()
  batchId!: string;

  @ApiProperty({ enum: AdjustmentType, example: AdjustmentType.PHYSICAL_COUNT_VARIANCE })
  @IsEnum(AdjustmentType)
  adjustmentType!: AdjustmentType;

  @ApiProperty({ example: 45, description: 'New physical count quantity' })
  @IsInt()
  adjustedQuantity!: number;

  @ApiProperty({ example: 'Monthly physical stock audit discrepancy' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
