import { Module } from '@nestjs/common';
import { SummariesController } from './summaries.controller';
import { SummariesRepository } from './summaries.repository';
import { SummariesService } from './summaries.service';

@Module({
  controllers: [SummariesController],
  providers: [SummariesRepository, SummariesService],
})
export class SummariesModule {}
