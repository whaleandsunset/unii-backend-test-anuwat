import { Injectable } from '@nestjs/common';
import { SummaryFilterDto } from './dto/summary-filter.dto';
import { toProductSummaryResponse } from './summaries.mapper';
import { SummariesRepository } from './summaries.repository';

@Injectable()
export class SummariesService {
  constructor(private readonly summariesRepository: SummariesRepository) {}

    async findAll(filters: SummaryFilterDto) {
    const rows = await this.summariesRepository.findMany(filters);

    return rows.map(toProductSummaryResponse);
  }
}
