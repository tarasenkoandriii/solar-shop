// Рендерит уже готовый SVG-текст, пришедший с бэкенда (шаблон +
// детерминированная подстановка резолвленных данных, ТЗ п.31.10.1 — Grok
// в этом процессе не участвует, поэтому безопасно вставлять как есть,
// источник — наш собственный сервер, не пользовательский ввод).
export function SchemaDiagram({ svg, title }: { svg: string; title: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-leaf-800/10 bg-white p-4">
      <p className="mb-2 text-sm font-medium text-leaf-900/60">{title}</p>
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
