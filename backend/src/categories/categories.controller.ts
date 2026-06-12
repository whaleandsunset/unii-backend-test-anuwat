import { Controller, Get, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}


  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':categoryId/sub-categories')
  findSubCategories(@Param('categoryId') categoryId: string) {
    return this.categoriesService.findSubCategories(categoryId);
  }
}
