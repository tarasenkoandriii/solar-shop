import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManufacturerDto, UpdateManufacturerDto } from './dto/manufacturer.dto';

@Injectable()
export class ManufacturersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.client.manufacturer.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: CreateManufacturerDto) {
    return this.prisma.client.manufacturer.create({ data: dto });
  }

  async update(id: string, dto: UpdateManufacturerDto) {
    await this.getOr404(id);
    return this.prisma.client.manufacturer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.getOr404(id);
    await this.prisma.client.manufacturer.delete({ where: { id } });
    return { ok: true };
  }

  private async getOr404(id: string) {
    const item = await this.prisma.client.manufacturer.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Manufacturer not found');
    return item;
  }
}
