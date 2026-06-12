import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}


  findAll() {
    return this.prisma.category.findMany({
      orderBy: { categoryId: 'asc' },
      include: {
        subCategories: {
          orderBy: { subCategoryId: 'asc' },
        },
      },
    });
  }


  findSubCategories(categoryId: string) {
    return this.prisma.subCategory.findMany({
      where: { categoryId },
      orderBy: { subCategoryId: 'asc' },
    });
  }
}
