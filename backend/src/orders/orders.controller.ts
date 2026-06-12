import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrderFilterDto } from './dto/order-filter.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

    @Get()
  findAll(@Query() filters: OrderFilterDto) {
    return this.ordersService.findAll(filters);
  }

    @Get(':orderId')
  findOne(@Param('orderId') orderId: string) {
    return this.ordersService.findOne(orderId);
  }
}
