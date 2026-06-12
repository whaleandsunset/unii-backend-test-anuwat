import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrderFilterDto } from './dto/order-filter.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

    findAll(filters: OrderFilterDto) {
    return this.prisma.order.findMany({
      where: this.buildWhere(filters),
      orderBy: [{ orderFinishedDate: 'desc' }, { orderId: 'asc' }],
      include: {
        items: {
          orderBy: [{ categoryId: 'asc' }, { subCategoryId: 'asc' }],
        },
      },
    });
  }

    async findOne(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
      include: {
        items: {
          orderBy: [{ categoryId: 'asc' }, { subCategoryId: 'asc' }],
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return order;
  }

    private buildWhere(filters: OrderFilterDto): Prisma.OrderWhereInput {
    return {
      orderId: filters.orderId
        ? { contains: filters.orderId, mode: 'insensitive' }
        : undefined,
      orderFinishedDate: {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(filters.endDate) : undefined,
      },
    };
  }
}
