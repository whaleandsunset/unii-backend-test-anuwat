import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SummaryFilterDto } from './dto/summary-filter.dto';
import { ProductSummaryRow } from './types/product-summary-row.type';

@Injectable()
export class SummariesRepository {
  constructor(private readonly prisma: PrismaService) {}

    findMany(filters: SummaryFilterDto) {
    const whereClause = this.buildWhereClause(filters);

    return this.prisma.$queryRaw<ProductSummaryRow[]>`
      WITH filtered_items AS (
        SELECT
          oi.category_id,
          c.category_name,
          oi.sub_category_id,
          sc.sub_category_name,
          oi.grade,
          oi.quantity_kg,
          oi.price_per_kg,
          oi.total_amount,
          o.order_id,
          o.transaction_type
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        JOIN categories c ON c.category_id = oi.category_id
        JOIN sub_categories sc ON sc.sub_category_id = oi.sub_category_id
        ${whereClause}
      ),
      grade_totals AS (
        SELECT
          category_id,
          sub_category_id,
          transaction_type,
          grade,
          SUM(quantity_kg) AS quantity_kg
        FROM filtered_items
        GROUP BY
          category_id,
          sub_category_id,
          transaction_type,
          grade
        HAVING SUM(quantity_kg) > 0
      )
      SELECT
        fi.category_id AS "categoryId",
        fi.category_name AS "categoryName",
        fi.sub_category_id AS "subCategoryId",
        fi.sub_category_name AS "subCategoryName",

        SUM(CASE WHEN fi.transaction_type = 'BUY' THEN fi.quantity_kg ELSE 0 END) AS "buyQuantityKg",
        SUM(CASE WHEN fi.transaction_type = 'BUY' THEN fi.total_amount ELSE 0 END) AS "buyTotalAmount",
        MIN(NULLIF(fi.price_per_kg, 0)) FILTER (WHERE fi.transaction_type = 'BUY') AS "buyMinPricePerKg",
        MAX(fi.price_per_kg) FILTER (WHERE fi.transaction_type = 'BUY') AS "buyMaxPricePerKg",
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE WHEN fi.transaction_type = 'BUY' THEN fi.order_id END), NULL) AS "buyOrderIds",
        COALESCE(
          (
            SELECT JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'grade', gt.grade,
                'quantityKg', gt.quantity_kg::text
              )
              ORDER BY gt.grade
            )
            FROM grade_totals gt
            WHERE
              gt.category_id = fi.category_id
              AND gt.sub_category_id = fi.sub_category_id
              AND gt.transaction_type = 'BUY'
          ),
          '[]'::jsonb
        ) AS "buyGradeBreakdown",

        SUM(CASE WHEN fi.transaction_type = 'SELL' THEN fi.quantity_kg ELSE 0 END) AS "sellQuantityKg",
        SUM(CASE WHEN fi.transaction_type = 'SELL' THEN fi.total_amount ELSE 0 END) AS "sellTotalAmount",
        MIN(NULLIF(fi.price_per_kg, 0)) FILTER (WHERE fi.transaction_type = 'SELL') AS "sellMinPricePerKg",
        MAX(fi.price_per_kg) FILTER (WHERE fi.transaction_type = 'SELL') AS "sellMaxPricePerKg",
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE WHEN fi.transaction_type = 'SELL' THEN fi.order_id END), NULL) AS "sellOrderIds",
        COALESCE(
          (
            SELECT JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'grade', gt.grade,
                'quantityKg', gt.quantity_kg::text
              )
              ORDER BY gt.grade
            )
            FROM grade_totals gt
            WHERE
              gt.category_id = fi.category_id
              AND gt.sub_category_id = fi.sub_category_id
              AND gt.transaction_type = 'SELL'
          ),
          '[]'::jsonb
        ) AS "sellGradeBreakdown",

        SUM(CASE WHEN fi.transaction_type = 'BUY' THEN fi.quantity_kg ELSE 0 END)
          - SUM(CASE WHEN fi.transaction_type = 'SELL' THEN fi.quantity_kg ELSE 0 END) AS "remainingQuantityKg",

        SUM(CASE WHEN fi.transaction_type = 'BUY' THEN fi.total_amount ELSE 0 END)
          - SUM(CASE WHEN fi.transaction_type = 'SELL' THEN fi.total_amount ELSE 0 END) AS "remainingAmount"
      FROM filtered_items fi
      GROUP BY
        fi.category_id,
        fi.category_name,
        fi.sub_category_id,
        fi.sub_category_name
      ORDER BY
        fi.category_id ASC,
        fi.sub_category_id ASC
    `;
  }

    private buildWhereClause(filters: SummaryFilterDto) {
    const conditions: Prisma.Sql[] = [];

    this.addDateFilters(conditions, filters);
    this.addProductFilters(conditions, filters);
    this.addOrderFilter(conditions, filters);
    this.addPriceFilters(conditions, filters);
    this.addGradeFilter(conditions, filters);

    return conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;
  }

    private addDateFilters(
    conditions: Prisma.Sql[],
    filters: SummaryFilterDto,
  ) {
    if (filters.startDate) {
      conditions.push(
        Prisma.sql`o.order_finished_date >= ${filters.startDate}::date`,
      );
    }

    if (filters.endDate) {
      conditions.push(
        Prisma.sql`o.order_finished_date <= ${filters.endDate}::date`,
      );
    }
  }

    private addProductFilters(
    conditions: Prisma.Sql[],
    filters: SummaryFilterDto,
  ) {
    if (filters.categoryId) {
      conditions.push(Prisma.sql`oi.category_id = ${filters.categoryId}`);
    }

    if (filters.subCategoryId) {
      conditions.push(
        Prisma.sql`oi.sub_category_id = ${filters.subCategoryId}`,
      );
    }
  }

    private addOrderFilter(
    conditions: Prisma.Sql[],
    filters: SummaryFilterDto,
  ) {
    if (filters.orderId) {
      conditions.push(Prisma.sql`o.order_id ILIKE ${`%${filters.orderId}%`}`);
    }
  }

    private addPriceFilters(
    conditions: Prisma.Sql[],
    filters: SummaryFilterDto,
  ) {
    if (filters.minPrice !== undefined) {
      conditions.push(Prisma.sql`oi.price_per_kg >= ${filters.minPrice}`);
    }

    if (filters.maxPrice !== undefined) {
      conditions.push(Prisma.sql`oi.price_per_kg <= ${filters.maxPrice}`);
    }
  }

    private addGradeFilter(
    conditions: Prisma.Sql[],
    filters: SummaryFilterDto,
  ) {
    if (filters.grade) {
      conditions.push(Prisma.sql`oi.grade = ${filters.grade}`);
    }
  }
}
