export const appConfig = () => ({
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  sourceUrls: {
    orders: process.env.ORDER_SOURCE_URL,
    products: process.env.PRODUCT_SOURCE_URL,
  },
});
