import type { SVGProps } from "react";

// За прямим запитом користувача ("на клиентском сайте показывает не
// все категории из админки") — знайдено реальний баг: головна
// сторінка мала ЖОРСТКО закодований список лише з 3 категорій, не
// підключений до API взагалі (на відміну від Header, який коректно
// підтягує ВСІ APPROVED категорії динамічно). Ця generic-іконка —
// fallback для БУДЬ-ЯКОЇ нової категорії без власного SVG (CABLE/
// CONNECTOR зараз, будь-що майбутнє), той самий стиль (24x24,
// stroke-based), що вже SolarPanelIcon/BatteryIcon/ControllerIcon.
export function GenericCategoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5L12 12l8-4.5M12 12v9" />
    </svg>
  );
}
