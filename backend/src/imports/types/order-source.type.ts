import type {
  Grade,
  TransactionType,
} from '../../common/constants/domain.constants';

export type SourceGradeItem = {
  grade: string;
  price: number | string;
  quantity: number | string;
  total?: number | string;
};

export type SourceProductItem = {
  categoryID: string;
  subCategoryID: string;
  requestList: SourceGradeItem[];
};

export type SourceOrder = {
  orderId: string;
  requestList: SourceProductItem[];
  orderFinishedDate: string;
  orderFinishedTime?: string;
};

export type OrderSourcePayload = {
  buyTransaction?: SourceOrder[];
  sellTransaction?: SourceOrder[];
};

export type NormalizedOrderItem = {
  orderId: string;
  categoryId: string;
  subCategoryId: string;
  grade: Grade;
  quantityKg: string;
  pricePerKg: string;
  totalAmount: string;
};

export type NormalizedOrder = {
  orderId: string;
  orderFinishedDate: Date;
  transactionType: TransactionType;
  items: NormalizedOrderItem[];
};

export type ImportOrdersResult = {
  importedOrders: number;
  importedItems: number;
};
