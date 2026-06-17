import { IsString } from 'class-validator';

export class MergeDistrictsDto {
  @IsString()
  declare targetId: string;
}
