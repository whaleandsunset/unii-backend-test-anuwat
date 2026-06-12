import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import {
  Grade,
  GRADES,
  TransactionType,
} from '../common/constants/domain.constants';
import {
  toDecimalString,
  toFiniteNumber,
} from '../common/utils/number-transform';
import { PrismaService } from '../prisma/prisma.service';
import {
  ImportOrdersResult,
  NormalizedOrder,
  NormalizedOrderItem,
  OrderSourcePayload,
  SourceOrder,
} from './types/order-source.type';
import {
  ImportProductsResult,
  ProductSourcePayload,
  SourceCategory,
  SourceSubCategory,
} from './types/product-source.type';

const ORDER_SOURCE_CONFIG_KEY = 'sourceUrls.orders';
const PRODUCT_SOURCE_CONFIG_KEY = 'sourceUrls.products';

type ProductMasterRefs = {
  categoryIds: Set<string>;
  subCategoryIds: Set<string>;
};

@Injectable()
export class ImportsService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async syncOrdersFromSource() {
    const payload = await this.fetchSourcePayload<OrderSourcePayload>(
      ORDER_SOURCE_CONFIG_KEY,
      'Order',
    );

    return this.importOrders(payload);
  }

  
  async syncProductsFromSource() {
    const payload = await this.fetchSourcePayload<ProductSourcePayload>(
      PRODUCT_SOURCE_CONFIG_KEY,
      'Product',
    );

    return this.importProducts(payload);
  }

  
  async importProducts(
    payload: ProductSourcePayload,
  ): Promise<ImportProductsResult> {
    const productList = payload.productList ?? [];
    let importedCategories = 0;
    let importedSubCategories = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const category of productList) {
        if (!category.categoryId || !category.categoryName) {
          continue;
        }

        await this.upsertCategory(tx, category);
        importedCategories += 1;

        for (const subCategory of category.subcategory ?? []) {
          if (!subCategory.subCategoryId || !subCategory.subCategoryName) {
            continue;
          }

          await this.upsertSubCategory(tx, category.categoryId, subCategory);
          importedSubCategories += 1;
        }
      }
    });

    return {
      importedCategories,
      importedSubCategories,
    };
  }

  
  async importOrders(payload: OrderSourcePayload): Promise<ImportOrdersResult> {
    const orders = this.normalizeOrders(payload);

    //ไม่มี order ให้ return 0
    if (!orders.length) {
      return { importedOrders: 0, importedItems: 0 };
    }

    //เช็กว่ามี category/subCategory 
    await this.assertMasterDataExists(orders);

    await this.prisma.$transaction(async (tx) => {
      for (const order of orders) {
        await this.upsertOrder(tx, order);
        await this.replaceOrderItems(tx, order);
      }
    });

    return {
      importedOrders: orders.length,
      importedItems: orders.reduce((sum, order) => sum + order.items.length, 0),
    };
  }

    private normalizeOrders(payload: OrderSourcePayload): NormalizedOrder[] {
    return [
      ...this.normalizeOrderGroup(payload.buyTransaction ?? [], 'BUY'),
      ...this.normalizeOrderGroup(payload.sellTransaction ?? [], 'SELL'),
    ];
  }

    private normalizeOrderGroup(
    orders: SourceOrder[],
    transactionType: TransactionType,
  ): NormalizedOrder[] {
    return orders
      .filter((order) => Boolean(order.orderId && order.orderFinishedDate))
      .map((order) => ({
        orderId: order.orderId,
        orderFinishedDate: new Date(order.orderFinishedDate),
        transactionType,
        items: this.normalizeItems(order),
      }));
  }

    private async fetchSourcePayload<T>(
    configKey: string,
    sourceName: string,
  ): Promise<T> {
    const sourceUrl = this.config.get<string>(configKey);

    if (!sourceUrl) {
      throw new BadRequestException(`${configKey} is not configured`);
    }

    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new BadRequestException(
        `${sourceName} source request failed with status ${response.status}`,
      );
    }

    return (await response.json()) as T;
  }

    private upsertCategory(
    tx: Prisma.TransactionClient,
    category: SourceCategory,
  ) {
    return tx.category.upsert({
      where: { categoryId: category.categoryId },
      update: { categoryName: category.categoryName },
      create: {
        categoryId: category.categoryId,
        categoryName: category.categoryName,
      },
    });
  }

    private upsertSubCategory(
    tx: Prisma.TransactionClient,
    categoryId: string,
    subCategory: SourceSubCategory,
  ) {
    return tx.subCategory.upsert({
      where: { subCategoryId: subCategory.subCategoryId },
      update: {
        categoryId,
        subCategoryName: subCategory.subCategoryName,
      },
      create: {
        categoryId,
        subCategoryId: subCategory.subCategoryId,
        subCategoryName: subCategory.subCategoryName,
      },
    });
  }

    private async upsertOrder(
    tx: Prisma.TransactionClient,
    order: NormalizedOrder,
  ) {
    await tx.order.upsert({
      where: { orderId: order.orderId },
      update: {
        orderFinishedDate: order.orderFinishedDate,
        transactionType: order.transactionType,
      },
      create: {
        orderId: order.orderId,
        orderFinishedDate: order.orderFinishedDate,
        transactionType: order.transactionType,
      },
    });
  }

    private async replaceOrderItems(
    tx: Prisma.TransactionClient,
    order: NormalizedOrder,
  ) {
    await tx.orderItem.deleteMany({
      where: { orderId: order.orderId },
    });

    if (order.items.length) {
      await tx.orderItem.createMany({
        data: order.items,
      });
    }
  }

    private normalizeItems(order: SourceOrder): NormalizedOrderItem[] {
    return (order.requestList ?? []).flatMap((productItem) =>
      (productItem.requestList ?? []).flatMap((gradeItem) => {
        if (!this.isValidGrade(gradeItem.grade)) {
          return [];
        }

        const quantity = toFiniteNumber(gradeItem.quantity);
        const price = toFiniteNumber(gradeItem.price);
        const sourceTotal = toFiniteNumber(gradeItem.total);
        const total = sourceTotal > 0 ? sourceTotal : quantity * price;

        return {
          orderId: order.orderId,
          categoryId: productItem.categoryID,
          subCategoryId: productItem.subCategoryID,
          grade: gradeItem.grade,
          quantityKg: toDecimalString(quantity),
          pricePerKg: toDecimalString(price),
          totalAmount: toDecimalString(total),
        };
      }),
    );
  }

    private async assertMasterDataExists(orders: NormalizedOrder[]) {
    const { categoryIds, subCategoryIds } =
      this.collectProductMasterRefs(orders);

    const [categories, subCategories] = await Promise.all([
      this.prisma.category.findMany({
        where: { categoryId: { in: [...categoryIds] } },
        select: { categoryId: true },
      }),
      this.prisma.subCategory.findMany({
        where: { subCategoryId: { in: [...subCategoryIds] } },
        select: { subCategoryId: true },
      }),
    ]);

    const existingCategoryIds = new Set(
      categories.map((category) => category.categoryId),
    );
    const existingSubCategoryIds = new Set(
      subCategories.map((subCategory) => subCategory.subCategoryId),
    );

    const missingCategoryIds = [...categoryIds].filter(
      (categoryId) => !existingCategoryIds.has(categoryId),
    );
    const missingSubCategoryIds = [...subCategoryIds].filter(
      (subCategoryId) => !existingSubCategoryIds.has(subCategoryId),
    );

    if (missingCategoryIds.length || missingSubCategoryIds.length) {
      throw new BadRequestException({
        message: 'Product master data must be imported before orders',
        missingCategoryIds,
        missingSubCategoryIds,
      });
    }
  }

    private isValidGrade(grade: string): grade is Grade {
    return GRADES.includes(grade as Grade);
  }

    private collectProductMasterRefs(
    orders: NormalizedOrder[],
  ): ProductMasterRefs {
    const categoryIds = new Set<string>();
    const subCategoryIds = new Set<string>();

    for (const order of orders) {
      for (const item of order.items) {
        categoryIds.add(item.categoryId);
        subCategoryIds.add(item.subCategoryId);
      }
    }

    return { categoryIds, subCategoryIds };
  }
}
