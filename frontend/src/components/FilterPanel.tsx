import { FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import type { Category, SummaryFilters } from '../api';
import { GRADES } from '../constants';

type FilterPanelProps = {
  categories: Category[];
  filters: SummaryFilters;
  subCategories: Category['subCategories'];
  onChange: (name: keyof SummaryFilters, value: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function FilterPanel({
  categories,
  filters,
  subCategories,
  onChange,
  onReset,
  onSubmit,
}: FilterPanelProps) {
  return (
    <section className="panel filter-panel" aria-label="ตัวกรองข้อมูล">
      <h2 className="filter-title">ตัวกรอง (Multiple Filters)</h2>
      <form onSubmit={onSubmit}>
        <div className="filter-grid">
          <label>
            <span className="visually-hidden">วันที่เริ่มต้น (from)</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => onChange('startDate', event.target.value)}
            />
          </label>

          <label>
            <span className="visually-hidden">วันที่สิ้นสุด (to)</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => onChange('endDate', event.target.value)}
            />
          </label>

          <label>
            <span className="visually-hidden">หมวดหมู่ (Category)</span>
            <select
              value={filters.categoryId}
              onChange={(event) => onChange('categoryId', event.target.value)}
            >
              <option value="">หมวดหมู่ (Category)</option>
              {categories.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.categoryName}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="visually-hidden">หมวดหมู่ย่อย (SubCategory)</span>
            <select
              value={filters.subCategoryId}
              disabled={!filters.categoryId}
              onChange={(event) => onChange('subCategoryId', event.target.value)}
            >
              <option value="">หมวดหมู่ย่อย (SubCategory)</option>
              {subCategories.map((subCategory) => (
                <option
                  key={subCategory.subCategoryId}
                  value={subCategory.subCategoryId}
                >
                  {subCategory.subCategoryName}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="visually-hidden">ราคาเริ่มต้น (บาท/กก.)</span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="ราคาเริ่มต้น (บาท/กก.)"
              value={filters.minPrice}
              onChange={(event) => onChange('minPrice', event.target.value)}
            />
          </label>

          <label>
            <span className="visually-hidden">ราคาสุดท้าย (บาท/กก.)</span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="ราคาสุดท้าย (บาท/กก.)"
              value={filters.maxPrice}
              onChange={(event) => onChange('maxPrice', event.target.value)}
            />
          </label>

          <label>
            <span className="visually-hidden">เกรด</span>
            <select
              value={filters.grade}
              onChange={(event) => onChange('grade', event.target.value)}
            >
              <option value="">เกรด</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>

          <label className="wide">
            <span className="visually-hidden">หมายเลขคำสั่งซื้อ (orderId)</span>
            <input
              type="search"
              placeholder="หมายเลขคำสั่งซื้อ (orderId)"
              value={filters.orderId}
              onChange={(event) => onChange('orderId', event.target.value)}
            />
          </label>
        </div>

        <div className="actions">
          <button className="secondary-button" type="button" onClick={onReset}>
            <X size={17} />
            <span>ล้างตัวกรอง</span>
          </button>
          <button className="primary-button" type="submit">
            <Search size={17} />
            <span>ค้นหา</span>
          </button>
        </div>
      </form>
    </section>
  );
}

