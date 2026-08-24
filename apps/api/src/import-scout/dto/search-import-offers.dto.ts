import { IsString } from 'class-validator';

// За прямим запитом користувача — реалізація doc/TZ_ImportScout.md.
export class SearchImportOffersDto {
  @IsString()
  productId!: string;
}
