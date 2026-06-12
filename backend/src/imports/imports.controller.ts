import { Body, Controller, Post } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { OrderSourcePayload } from './types/order-source.type';
import { ProductSourcePayload } from './types/product-source.type';

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('orders')
  importOrders(@Body() payload: OrderSourcePayload) {
    return this.importsService.importOrders(payload);
  }

  @Post('orders/sync')
  syncOrdersFromSource() {
    return this.importsService.syncOrdersFromSource();
  }

  @Post('products')
  importProducts(@Body() payload: ProductSourcePayload) {
    return this.importsService.importProducts(payload);
  }

  @Post('products/sync')
  syncProductsFromSource() {
    return this.importsService.syncProductsFromSource();
  }
}
