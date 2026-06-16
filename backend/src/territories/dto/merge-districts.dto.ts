import { IsUUID } from 'class-validator';

export class MergeDistrictsDto {
  @IsUUID()
  declare targetId: string;
}
