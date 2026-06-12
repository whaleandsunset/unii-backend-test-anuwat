import type { Decimal } from '@prisma/client/runtime/library';
import type { Grade } from '../../common/constants/domain.constants';

export type GradeBreakdown = {
  grade: Grade;
  quantityKg: string;
};

export type ProductSummaryRow = {
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  buyQuantityKg: Decimal;
  buyTotalAmount: Decimal;
  buyMinPricePerKg: Decimal | null;
  buyMaxPricePerKg: Decimal | null;
  buyOrderIds: string[];
  buyGradeBreakdown: GradeBreakdown[];
  sellQuantityKg: Decimal;
  sellTotalAmount: Decimal;
  sellMinPricePerKg: Decimal | null;
  sellMaxPricePerKg: Decimal | null;
  sellOrderIds: string[];
  sellGradeBreakdown: GradeBreakdown[];
  remainingQuantityKg: Decimal;
  remainingAmount: Decimal;
};

export type ProductSummaryResponse = Omit<
  ProductSummaryRow,
  | 'buyQuantityKg'
  | 'buyTotalAmount'
  | 'buyMinPricePerKg'
  | 'buyMaxPricePerKg'
  | 'sellQuantityKg'
  | 'sellTotalAmount'
  | 'sellMinPricePerKg'
  | 'sellMaxPricePerKg'
  | 'remainingQuantityKg'
  | 'remainingAmount'
> & {
  buyQuantityKg: string;
  buyTotalAmount: string;
  buyMinPricePerKg: string | null;
  buyMaxPricePerKg: string | null;
  sellQuantityKg: string;
  sellTotalAmount: string;
  sellMinPricePerKg: string | null;
  sellMaxPricePerKg: string | null;
  remainingQuantityKg: string;
  remainingAmount: string;
};
