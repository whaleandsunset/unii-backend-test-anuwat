import type {
  ProductSummaryResponse,
  ProductSummaryRow,
} from './types/product-summary-row.type';

export function toProductSummaryResponse(
  row: ProductSummaryRow,
): ProductSummaryResponse {
  return {
    ...row,
    buyQuantityKg: row.buyQuantityKg.toString(),
    buyTotalAmount: row.buyTotalAmount.toString(),
    buyMinPricePerKg: row.buyMinPricePerKg?.toString() ?? null,
    buyMaxPricePerKg: row.buyMaxPricePerKg?.toString() ?? null,
    sellQuantityKg: row.sellQuantityKg.toString(),
    sellTotalAmount: row.sellTotalAmount.toString(),
    sellMinPricePerKg: row.sellMinPricePerKg?.toString() ?? null,
    sellMaxPricePerKg: row.sellMaxPricePerKg?.toString() ?? null,
    remainingQuantityKg: row.remainingQuantityKg.toString(),
    remainingAmount: row.remainingAmount.toString(),
  };
}
