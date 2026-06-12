import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { GRADES, Grade } from '../../common/constants/domain.constants';
import { optionalNumber } from '../../common/utils/number-transform';

export class SummaryFilterDto {
    @IsOptional()
  @IsDateString()
  startDate?: string;

    @IsOptional()
  @IsDateString()
  endDate?: string;

    @IsOptional()
  @IsString()
  categoryId?: string;

    @IsOptional()
  @IsString()
  subCategoryId?: string;

    @IsOptional()
  @IsString()
  orderId?: string;

    @IsOptional()
  @Transform(({ value }) => optionalNumber(value))
  @IsNumber()
  @Min(0)
  minPrice?: number;

    @IsOptional()
  @Transform(({ value }) => optionalNumber(value))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

    @IsOptional()
  @IsIn(GRADES)
  grade?: Grade;
}
