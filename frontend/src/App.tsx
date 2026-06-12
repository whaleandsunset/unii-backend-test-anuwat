import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import {
  Category,
  ProductSummary,
  SummaryFilters,
  getCategories,
  getSummaries,
} from './api';
import { FilterPanel } from './components/FilterPanel';
import { SummaryTable } from './components/SummaryTable';

const initialFilters: SummaryFilters = {
  startDate: '',
  endDate: '',
  categoryId: '',
  subCategoryId: '',
  orderId: '',
  minPrice: '',
  maxPrice: '',
  grade: '',
};

function calculateTotals(rows: ProductSummary[]) {
  return rows.reduce(
    (sum, row) => ({
      buyQuantityKg: sum.buyQuantityKg + Number(row.buyQuantityKg),
      buyTotalAmount: sum.buyTotalAmount + Number(row.buyTotalAmount),
      sellQuantityKg: sum.sellQuantityKg + Number(row.sellQuantityKg),
      sellTotalAmount: sum.sellTotalAmount + Number(row.sellTotalAmount),
      remainingQuantityKg:
        sum.remainingQuantityKg + Number(row.remainingQuantityKg),
      remainingAmount: sum.remainingAmount + Number(row.remainingAmount),
    }),
    {
      buyQuantityKg: 0,
      buyTotalAmount: 0,
      sellQuantityKg: 0,
      sellTotalAmount: 0,
      remainingQuantityKg: 0,
      remainingAmount: 0,
    },
  );
}

export function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [summaries, setSummaries] = useState<ProductSummary[]>([]);
  const [filters, setFilters] = useState<SummaryFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const hasLoadedInitialData = useRef(false);

  const subCategories = useMemo(() => {
    const selectedCategory = categories.find(
      (category) => category.categoryId === filters.categoryId,
    );

    return selectedCategory?.subCategories ?? [];
  }, [categories, filters.categoryId]);

  const totals = useMemo(() => calculateTotals(summaries), [summaries]);

  async function loadData(nextFilters = filters) {
    setIsLoading(true);
    setError('');

    try {
      const [categoryResult, summaryResult] = await Promise.all([
        categories.length ? Promise.resolve(categories) : getCategories(),
        getSummaries(nextFilters),
      ]);

      setCategories(categoryResult);
      setSummaries(summaryResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData(initialFilters);
  }, []);

  useEffect(() => {
    if (!hasLoadedInitialData.current) {
      hasLoadedInitialData.current = true;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadData(filters);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [filters]);

  function updateFilter(name: keyof SummaryFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === 'categoryId' ? { subCategoryId: '' } : {}),
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadData(filters);
  }

  function handleReset() {
    setFilters(initialFilters);
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Product Trade Summary</p>
          <h1>สรุปยอดซื้อ-ขายรายสินค้า</h1>
        </div>
        <button className="icon-button" type="button" onClick={() => loadData()}>
          <RefreshCcw size={18} />
          <span>โหลดใหม่</span>
        </button>
      </header>

      <FilterPanel
        categories={categories}
        filters={filters}
        subCategories={subCategories}
        onChange={updateFilter}
        onReset={handleReset}
        onSubmit={handleSubmit}
      />

      <SummaryTable
        error={error}
        isLoading={isLoading}
        rows={summaries}
        totals={totals}
      />
    </main>
  );
}

