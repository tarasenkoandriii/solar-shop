// Генератор SVG-шаблонов схем (ТЗ п.31.10.1) — детерминированный код,
// написанный вручную, НЕ вызов ИИ. Порядок блоков и направление стрелок
// зафиксированы здесь программно, чтобы гарантировать электрически верную
// последовательность панели→контроллер→АКБ→інвертор→навантаження для
// каждой топологии — ошибка в этом файле имеет те же последствия, что и
// ошибка в SVG, нарисованном руками, поэтому логика простая и явная,
// без динамической генерации связей.
//
// ВАЖНЫЙ НЮАНС КАТАЛОГА: у нас нет отдельной категории "Інвертор" (ТЗ п.4
// содержит только SOLAR_PANEL/BATTERY/CONTROLLER) — на схеме блок інвертора
// показан информационно (электрически обязателен для любой топологии), но
// НЕ резолвится в реальный товар/цену, помечен отдельным текстом.

export interface SchemaBlock {
  token: string; // плейсхолдер вида {{PANELS_LABEL}}
  fallbackLabel: string;
  x: number;
  y: number;
  w: number;
  h: number;
  dashed?: boolean; // опциональный/будущий блок (напр. АКБ в GRID_TIE)
}

export interface SchemaArrow {
  fromToken: string;
  toToken: string;
}

const BOX_W = 150;
const BOX_H = 60;
const GAP_X = 60;
const ROW_Y = 100;

function box(token: string, fallbackLabel: string, index: number, opts: { dashed?: boolean; y?: number } = {}): SchemaBlock {
  return {
    token,
    fallbackLabel,
    x: 40 + index * (BOX_W + GAP_X),
    y: opts.y ?? ROW_Y,
    w: BOX_W,
    h: BOX_H,
    dashed: opts.dashed,
  };
}

function renderSvg(blocks: SchemaBlock[], arrows: SchemaArrow[], width: number, height: number, detailed: boolean): string {
  const byToken = new Map(blocks.map((b) => [b.token, b]));

  const boxesSvg = blocks
    .map(
      (b) => `
    <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8"
      fill="#f3f8f4" stroke="#153a20" stroke-width="2"
      ${b.dashed ? 'stroke-dasharray="6,4"' : ''} />
    <text x="${b.x + b.w / 2}" y="${b.y + b.h / 2}" text-anchor="middle" dominant-baseline="middle"
      font-family="sans-serif" font-size="13" fill="#153a20">${b.token}</text>`,
    )
    .join('');

  const arrowsSvg = arrows
    .map((a) => {
      const from = byToken.get(a.fromToken);
      const to = byToken.get(a.toToken);
      if (!from || !to) return '';
      const x1 = from.x + from.w;
      const y1 = from.y + from.h / 2;
      const x2 = to.x;
      const y2 = to.y + to.h / 2;
      const polarityLabel = detailed ? `<text x="${(x1 + x2) / 2}" y="${y1 - 8}" text-anchor="middle" font-size="10" fill="#666">DC ${detailed ? '+/-' : ''}</text>` : '';
      return `<line x1="${x1}" y1="${y1}" x2="${x2 - 6}" y2="${y2}" stroke="#153a20" stroke-width="2" marker-end="url(#arrowhead)" />${polarityLabel}`;
    })
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#153a20" />
    </marker>
  </defs>
  ${boxesSvg}
  ${arrowsSvg}
</svg>`;
}

// ---- OFF_GRID: панелі → контролер → АКБ → інвертор → навантаження ----
function buildOffGrid(detailed: boolean): string {
  const blocks = [
    box('{{PANELS_LABEL}}', 'Сонячні панелі', 0),
    box('{{CONTROLLER_LABEL}}', 'Контролер заряду', 1),
    box('{{BATTERY_LABEL}}', 'Акумулятор', 2),
    box('{{INVERTER_LABEL}}', 'Інвертор', 3),
    box('{{LOAD_LABEL}}', 'Навантаження', 4),
  ];
  const arrows: SchemaArrow[] = [
    { fromToken: '{{PANELS_LABEL}}', toToken: '{{CONTROLLER_LABEL}}' },
    { fromToken: '{{CONTROLLER_LABEL}}', toToken: '{{BATTERY_LABEL}}' },
    { fromToken: '{{BATTERY_LABEL}}', toToken: '{{INVERTER_LABEL}}' },
    { fromToken: '{{INVERTER_LABEL}}', toToken: '{{LOAD_LABEL}}' },
  ];
  return renderSvg(blocks, arrows, 40 + 5 * (BOX_W + GAP_X), 220, detailed);
}

// ---- BACKUP_UPS: мережа + панелі → контролер → АКБ → інвертор(АВР) → навантаження ----
function buildBackupUps(detailed: boolean): string {
  const blocks = [
    box('{{GRID_LABEL}}', 'Мережа 220В', 0, { y: ROW_Y - 90 }),
    box('{{PANELS_LABEL}}', 'Сонячні панелі', 0),
    box('{{CONTROLLER_LABEL}}', 'Контролер заряду', 1),
    box('{{BATTERY_LABEL}}', 'Акумулятор', 2),
    box('{{INVERTER_LABEL}}', 'Інвертор з АВР', 3),
    box('{{LOAD_LABEL}}', 'Навантаження', 4),
  ];
  const arrows: SchemaArrow[] = [
    { fromToken: '{{PANELS_LABEL}}', toToken: '{{CONTROLLER_LABEL}}' },
    { fromToken: '{{CONTROLLER_LABEL}}', toToken: '{{BATTERY_LABEL}}' },
    { fromToken: '{{BATTERY_LABEL}}', toToken: '{{INVERTER_LABEL}}' },
    { fromToken: '{{GRID_LABEL}}', toToken: '{{INVERTER_LABEL}}' },
    { fromToken: '{{INVERTER_LABEL}}', toToken: '{{LOAD_LABEL}}' },
  ];
  return renderSvg(blocks, arrows, 40 + 5 * (BOX_W + GAP_X), 220, detailed);
}

// ---- GRID_TIE: панелі → мережевий інвертор → мережа (продаж надлишків), АКБ опційно ----
function buildGridTie(detailed: boolean): string {
  const blocks = [
    box('{{PANELS_LABEL}}', 'Сонячні панелі', 0),
    box('{{INVERTER_LABEL}}', 'Мережевий інвертор', 1),
    box('{{GRID_LABEL}}', 'Мережа (продаж надлишків)', 2),
    box('{{BATTERY_LABEL}}', 'Акумулятор (опційно)', 1, { dashed: true, y: ROW_Y + 100 }),
  ];
  const arrows: SchemaArrow[] = [
    { fromToken: '{{PANELS_LABEL}}', toToken: '{{INVERTER_LABEL}}' },
    { fromToken: '{{INVERTER_LABEL}}', toToken: '{{GRID_LABEL}}' },
  ];
  return renderSvg(blocks, arrows, 40 + 3 * (BOX_W + GAP_X), 220, detailed);
}

// ---- COMMERCIAL: розширена BACKUP_UPS з кількома незалежними контурами ----
function buildCommercial(detailed: boolean): string {
  const blocks = [
    box('{{GRID_LABEL}}', 'Мережа 220/380В', 0, { y: ROW_Y - 90 }),
    box('{{PANELS_LABEL}}', 'Сонячні панелі (масив)', 0),
    box('{{CONTROLLER_LABEL}}', 'Контролери заряду', 1),
    box('{{BATTERY_LABEL}}', 'Акумуляторний банк', 2),
    box('{{INVERTER_LABEL}}', 'Інвертор(и) з АВР', 3),
    box('{{LOAD_LABEL}}', 'Контур навантаження 1', 4, { y: ROW_Y - 40 }),
    box('{{LOAD2_LABEL}}', 'Контур навантаження 2', 4, { y: ROW_Y + 40 }),
  ];
  const arrows: SchemaArrow[] = [
    { fromToken: '{{PANELS_LABEL}}', toToken: '{{CONTROLLER_LABEL}}' },
    { fromToken: '{{CONTROLLER_LABEL}}', toToken: '{{BATTERY_LABEL}}' },
    { fromToken: '{{BATTERY_LABEL}}', toToken: '{{INVERTER_LABEL}}' },
    { fromToken: '{{GRID_LABEL}}', toToken: '{{INVERTER_LABEL}}' },
    { fromToken: '{{INVERTER_LABEL}}', toToken: '{{LOAD_LABEL}}' },
    { fromToken: '{{INVERTER_LABEL}}', toToken: '{{LOAD2_LABEL}}' },
  ];
  return renderSvg(blocks, arrows, 40 + 5 * (BOX_W + GAP_X), 260, detailed);
}

export function buildSchemaTemplateSvg(topology: string, detailed: boolean): string {
  switch (topology) {
    case 'OFF_GRID':
      return buildOffGrid(detailed);
    case 'BACKUP_UPS':
      return buildBackupUps(detailed);
    case 'GRID_TIE':
      return buildGridTie(detailed);
    case 'COMMERCIAL':
      return buildCommercial(detailed);
    default:
      throw new Error(`Unknown topology: ${topology}`);
  }
}
