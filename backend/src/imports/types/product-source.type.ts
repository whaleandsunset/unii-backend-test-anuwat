export type SourceSubCategory = {
  subCategoryId: string;
  subCategoryName: string;
};

export type SourceCategory = {
  categoryId: string;
  categoryName: string;
  subcategory?: SourceSubCategory[];
};

export type ProductSourcePayload = {
  StatusCode?: number;
  success?: boolean;
  productList?: SourceCategory[];
};

export type ImportProductsResult = {
  importedCategories: number;
  importedSubCategories: number;
};
