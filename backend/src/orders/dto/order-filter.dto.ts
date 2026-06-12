import { IsDateString, IsOptional, IsString } from 'class-validator';

export class OrderFilterDto {
    @IsOptional()
  @IsDateString()
  startDate?: string;

    @IsOptional()
  @IsDateString()
  endDate?: string;

    @IsOptional()
  @IsString()
  orderId?: string;
}
