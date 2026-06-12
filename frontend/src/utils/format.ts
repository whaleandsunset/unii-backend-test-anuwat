export function formatNumber(value: string | number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatOrderIds(orderIds: string[]) {
  if (!orderIds.length) {
    return '-';
  }

  const preview = orderIds.slice(0, 2).join(', ');
  const remaining = orderIds.length - 2;

  return remaining > 0 ? `${preview} +${remaining} รายการ` : preview;
}

export function formatPriceRange(
  minPrice: string | null,
  maxPrice: string | null,
) {
  if (!minPrice || !maxPrice) {
    return '-';
  }

  const min = formatNumber(minPrice);
  const max = formatNumber(maxPrice);

  return min === max ? min : `${min} - ${max}`;
}

