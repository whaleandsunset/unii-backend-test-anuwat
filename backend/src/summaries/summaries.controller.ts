import { Controller, Get, Query } from '@nestjs/common';
import { SummaryFilterDto } from './dto/summary-filter.dto';
import { SummariesService } from './summaries.service';

@Controller('product-summaries')
export class SummariesController {
  constructor(private readonly summariesService: SummariesService) {}

    @Get()
  findAll(@Query() filters: SummaryFilterDto) {
    return this.summariesService.findAll(filters);
  }
}
