import { IsIn, IsOptional } from 'class-validator';
import { UserRole } from '@solar-shop/db';

export class DevLoginDto {
  @IsOptional()
  @IsIn(['CUSTOMER', 'MANAGER', 'ADMIN'])
  role?: UserRole;
}
