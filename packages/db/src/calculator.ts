// Чистые функции калькулятора без побочных эффектов — используются и в
// apps/api (реальный резолвинг), и потенциально в тестах.

export type SchemaTopologyValue = 'OFF_GRID' | 'BACKUP_UPS' | 'GRID_TIE' | 'COMMERCIAL';

// ТЗ п.31.1.1 — правило разрешения конфликтов: если выбрано несколько целей
// с разными defaultTopology, берём максимально требовательную, приоритет
// OFF_GRID > BACKUP_UPS > GRID_TIE > COMMERCIAL.
const TOPOLOGY_PRIORITY: SchemaTopologyValue[] = ['OFF_GRID', 'BACKUP_UPS', 'GRID_TIE', 'COMMERCIAL'];

export function resolveTopologyFromGoals(
  goalTopologies: (SchemaTopologyValue | null | undefined)[],
): SchemaTopologyValue | null {
  const present = new Set(goalTopologies.filter((t): t is SchemaTopologyValue => Boolean(t)));
  for (const candidate of TOPOLOGY_PRIORITY) {
    if (present.has(candidate)) return candidate;
  }
  return null;
}
