import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadSource } from '@solar-shop/db';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import { CreateLeadDto, UpdateLeadStatusDto } from './dto/create-lead.dto';

// Фаза 2: Lead остался ТОЛЬКО для общей формы обратной связи на /contacts
// (ТЗ п.3.4) — сценарий "узнать цену"/"купить" на карточке товара теперь
// полностью проходит через Cart/Order (см. packages/db/prisma/schema.prisma).
@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  async create(dto: CreateLeadDto) {
    const lead = await this.prisma.client.lead.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        comment: dto.comment,
        source: (dto.source as LeadSource) ?? LeadSource.WEB,
      },
    });
    await this.notify.notifyLead(lead);
    return lead;
  }

  findAllForAdmin() {
    return this.prisma.client.lead.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto) {
    const lead = await this.prisma.client.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.prisma.client.lead.update({ where: { id }, data: { status: dto.status } });
  }
}
