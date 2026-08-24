import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService } from '../grok/grok.service';

// ТЗ п.31.10.1a — разовый ИИ-аудит готовых (вручную/детерминированно
// подготовленных) шаблонов схем. НЕ итеративная доработка — одна проверка,
// правки вносит админ вручную по замечаниям.
@Injectable()
export class SchemaTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
  ) {}

  findAll() {
    return this.prisma.client.schemaTemplate.findMany({ orderBy: [{ topology: 'asc' }, { diagramType: 'asc' }] });
  }

  async updateSvg(id: string, svgTemplate: string, notes?: string) {
    await this.getOr404(id);
    return this.prisma.client.schemaTemplate.update({ where: { id }, data: { svgTemplate, notes } });
  }

  async runAudit(id: string) {
    const template = await this.getOr404(id);
    const report = await this.grok.auditSchemaTemplate(template.svgTemplate, template.topology);
    if (!report) {
      return this.prisma.client.schemaTemplate.update({
        where: { id },
        data: { lastAuditReport: 'ІІ-аудит недоступний (GROK_API_KEY не налаштований або сталася помилка)', lastAuditAt: new Date() },
      });
    }
    return this.prisma.client.schemaTemplate.update({
      where: { id },
      data: { lastAuditReport: report, lastAuditAt: new Date() },
    });
  }

  private async getOr404(id: string) {
    const template = await this.prisma.client.schemaTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Schema template not found');
    return template;
  }
}
