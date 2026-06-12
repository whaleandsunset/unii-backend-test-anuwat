import type { ProductSummary } from '../api';
import { formatNumber, formatOrderIds, formatPriceRange } from '../utils/format';
import { GradeChips } from './GradeChips';

type SummaryTotals = {
  buyQuantityKg: number;
  buyTotalAmount: number;
  sellQuantityKg: number;
  sellTotalAmount: number;
  remainingQuantityKg: number;
  remainingAmount: number;
};

type SummaryTableProps = {
  error: string;
  isLoading: boolean;
  rows: ProductSummary[];
  totals: SummaryTotals;
};

export function SummaryTable({
  error,
  isLoading,
  rows,
  totals,
}: SummaryTableProps) {
  return (
    <section className="panel table-panel" aria-label="ตารางสรุป">
      <div className="table-heading">
        <h2>ตารางสรุปราย SubCategory</h2>
        <span>แสดง {rows.length} รายการ</span>
      </div>

      {error ? <div className="message error">{error}</div> : null}
      {isLoading ? <div className="message">กำลังโหลดข้อมูล...</div> : null}

      {!isLoading && !error && rows.length === 0 ? (
        <div className="message">ไม่พบข้อมูลตามเงื่อนไขที่ค้นหา</div>
      ) : null}

      {!isLoading && !error && rows.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  Category/
                  <br />
                  SubCategory
                </th>
                <th>ซื้อรวม (กก.)</th>
                <th>ซื้อแยกเกรด</th>
                <th>OrderId (ซื้อ)</th>
                <th>ยอดซื้อรวม (บาท)</th>
                <th>ขายรวม (กก.)</th>
                <th>ขายแยกเกรด</th>
                <th>OrderId (ขาย)</th>
                <th>ยอดขายรวม (บาท)</th>
                <th>คงเหลือ (กก.)</th>
                <th>คงเหลือ (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.categoryId}-${row.subCategoryId}`}>
                  <td>
                    <div className="item-name">
                      <span>{row.categoryName}</span>
                      <strong>{row.subCategoryName}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="amount-cell">
                      <strong>{formatNumber(row.buyQuantityKg)}</strong>
                      <span>ราคาซื้อ (ช่วง)</span>
                      <small>
                        {formatPriceRange(
                          row.buyMinPricePerKg,
                          row.buyMaxPricePerKg,
                        )}
                      </small>
                    </div>
                  </td>
                  <td>
                    <GradeChips grades={row.buyGradeBreakdown} />
                  </td>
                  <td className="order-cell" title={row.buyOrderIds.join(', ')}>
                    {formatOrderIds(row.buyOrderIds)}
                  </td>
                  <td>{formatNumber(row.buyTotalAmount)}</td>
                  <td>
                    <div className="amount-cell">
                      <strong>{formatNumber(row.sellQuantityKg)}</strong>
                      <span>ราคาขาย (ช่วง)</span>
                      <small>
                        {formatPriceRange(
                          row.sellMinPricePerKg,
                          row.sellMaxPricePerKg,
                        )}
                      </small>
                    </div>
                  </td>
                  <td>
                    <GradeChips grades={row.sellGradeBreakdown} />
                  </td>
                  <td className="order-cell" title={row.sellOrderIds.join(', ')}>
                    {formatOrderIds(row.sellOrderIds)}
                  </td>
                  <td>{formatNumber(row.sellTotalAmount)}</td>
                  <td>{formatNumber(row.remainingQuantityKg)}</td>
                  <td>{formatNumber(row.remainingAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>รวมทั้งหมด</td>
                <td>{formatNumber(totals.buyQuantityKg)}</td>
                <td>-</td>
                <td>-</td>
                <td>{formatNumber(totals.buyTotalAmount)}</td>
                <td>{formatNumber(totals.sellQuantityKg)}</td>
                <td>-</td>
                <td>-</td>
                <td>{formatNumber(totals.sellTotalAmount)}</td>
                <td>{formatNumber(totals.remainingQuantityKg)}</td>
                <td>{formatNumber(totals.remainingAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </section>
  );
}

