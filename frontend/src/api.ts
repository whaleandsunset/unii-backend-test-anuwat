const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export type SubCategory = {
  id: string;
  subCategoryId: string;
  categoryId: string;
  subCategoryName: string;
};

export type Category = {
  id: string;
  categoryId: string;
  categoryName: string;
  subCategories: SubCategory[];
};

export type ProductSummary = {
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  buyQuantityKg: string;
  buyTotalAmount: string;
  buyMinPricePerKg: string | null;
  buyMaxPricePerKg: string | null;
  buyOrderIds: string[];
  buyGradeBreakdown: Array<{
    grade: string;
    quantityKg: string;
  }>;
  sellQuantityKg: string;
  sellTotalAmount: string;
  sellMinPricePerKg: string | null;
  sellMaxPricePerKg: string | null;
  sellOrderIds: string[];
  sellGradeBreakdown: Array<{
    grade: string;
    quantityKg: string;
  }>;
  remainingQuantityKg: string;
  remainingAmount: string;
};

export type SummaryFilters = {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  subCategoryId?: string;
  orderId?: string;
  minPrice?: string;
  maxPrice?: string;
  grade?: string;
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getCategories() {
  return request<Category[]>('/categories');
}

export function getSummaries(filters: SummaryFilters) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return request<ProductSummary[]>(
    query ? `/product-summaries?${query}` : '/product-summaries',
  );
}
