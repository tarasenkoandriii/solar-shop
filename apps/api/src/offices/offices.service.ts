import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfficeDto, UpdateOfficeDto } from './dto/office.dto';

@Injectable()
export class OfficesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.client.office.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  create(dto: CreateOfficeDto) {
    return this.prisma.client.office.create({ data: dto });
  }

  async update(id: string, dto: UpdateOfficeDto) {
    await this.getOr404(id);
    return this.prisma.client.office.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.getOr404(id);
    await this.prisma.client.office.delete({ where: { id } });
    return { ok: true };
  }

  private async getOr404(id: string) {
    const item = await this.prisma.client.office.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Office not found');
    return item;
  }
}
