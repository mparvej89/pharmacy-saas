import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsBoolean, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BankAccountType, BankTransactionType, PaymentMethod } from '@prisma/client';

export class CreateCashBankAccountDto {
  @ApiProperty({ description: 'Display name for account, e.g. "Main Cash Counter", "SBI Current A/c"' })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({ enum: BankAccountType, default: BankAccountType.BANK })
  @IsEnum(BankAccountType)
  accountType: BankAccountType;

  @ApiPropertyOptional({ description: 'Masked Account Number (never store secrets)' })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank Name, e.g. HDFC Bank' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ description: 'IFSC Code' })
  @IsString()
  @IsOptional()
  ifscCode?: string;

  @ApiPropertyOptional({ description: 'Branch Name' })
  @IsString()
  @IsOptional()
  branchName?: string;

  @ApiPropertyOptional({ description: 'UPI VPA handle' })
  @IsString()
  @IsOptional()
  upiId?: string;

  @ApiPropertyOptional({ description: 'Opening Balance (Book)', default: 0 })
  @IsNumber()
  @IsOptional()
  openingBalance?: number;

  @ApiPropertyOptional({ description: 'Opening Date' })
  @IsDateString()
  @IsOptional()
  openingDate?: string;

  @ApiPropertyOptional({ description: 'Is default account for this payment type', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateCashBankAccountDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiPropertyOptional({ enum: BankAccountType })
  @IsEnum(BankAccountType)
  @IsOptional()
  accountType?: BankAccountType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ifscCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branchName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  upiId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateBankTransactionDto {
  @ApiProperty({ description: 'Account ID to post transaction' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ enum: BankTransactionType })
  @IsEnum(BankTransactionType)
  transactionType: BankTransactionType;

  @ApiProperty({ description: 'Transaction Amount (Must be greater than 0)' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Transaction Date' })
  @IsDateString()
  @IsOptional()
  transactionDate?: string;

  @ApiPropertyOptional({ description: 'Cheque / UTR / Reference No' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Customer, Supplier, Payee, or Beneficiary Name' })
  @IsString()
  @IsOptional()
  partyName?: string;

  @ApiProperty({ description: 'Detailed Narration / Ledger note' })
  @IsString()
  @IsNotEmpty()
  narration: string;

  @ApiPropertyOptional({ description: 'Expense or Receipt Category (e.g. Rent, Salary, Electricity, Direct Receipt)' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Destination Account ID for CONTRA Transfer / Deposit / Withdrawal' })
  @IsString()
  @IsOptional()
  transferAccountId?: string;

  @ApiPropertyOptional({ description: 'Linked Supplier ID for Supplier payment' })
  @IsString()
  @IsOptional()
  relatedSupplierId?: string;

  @ApiPropertyOptional({ description: 'Linked Customer ID for Customer collection' })
  @IsString()
  @IsOptional()
  relatedCustomerId?: string;
}

export class ReverseTransactionDto {
  @ApiProperty({ description: 'Auditable reason for transaction reversal' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class BankStatementImportDto {
  @ApiProperty({ description: 'Target Bank Account ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    description: 'List of statement lines imported from CSV/Bank entry',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        statementDate: { type: 'string' },
        description: { type: 'string' },
        referenceNumber: { type: 'string' },
        withdrawalAmount: { type: 'number' },
        depositAmount: { type: 'number' },
        bankBalance: { type: 'number' },
      },
    },
  })
  entries: Array<{
    statementDate: string;
    description: string;
    referenceNumber?: string;
    withdrawalAmount?: number;
    depositAmount?: number;
    bankBalance?: number;
  }>;
}

export class MatchStatementDto {
  @ApiProperty({ description: 'Statement Entry ID' })
  @IsString()
  @IsNotEmpty()
  statementId: string;

  @ApiPropertyOptional({ description: 'Matched Book Transaction ID (null for manual sign-off)' })
  @IsString()
  @IsOptional()
  transactionId?: string;
}

export class CreateDailyCashClosingDto {
  @ApiProperty({ description: 'Cash in Hand Account ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ description: 'Physical cash counted at register end of day' })
  @IsNumber()
  @Min(0)
  physicalCashCounted: number;

  @ApiPropertyOptional({ description: 'Closing date, defaults to today' })
  @IsDateString()
  @IsOptional()
  closingDate?: string;

  @ApiPropertyOptional({ description: 'Cash register closing notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
