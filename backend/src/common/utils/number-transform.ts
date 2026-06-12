export function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return toFiniteNumber(value); 
}

export function toFiniteNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function toDecimalString(value: number): string {
  return value.toFixed(2);
}
