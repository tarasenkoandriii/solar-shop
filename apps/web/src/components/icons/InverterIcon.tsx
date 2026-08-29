import type { SVGProps } from "react";

// Категорія INVERTER. Суть приладу — перетворення постійного струму на
// змінний, тому всередині корпусу пряма лінія (DC) переходить у синус
// (AC). Це читається навіть у 40 пікселях і не потребує підпису, на
// відміну від «просто коробки з кнопками», яка виглядала б як
// контролер заряду (ControllerIcon поруч у тій самій сітці).
export function InverterIcon(props: SVGProps<SVGSVGElement>) {
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
      <rect x="2.6" y="5.2" width="18.8" height="13.6" rx="2.2" />
      {/* DC — пряма */}
      <path d="M5.6 12h3.1" />
      {/* Перехід */}
      <path d="m10.4 9.9 2.1 2.1-2.1 2.1" />
      {/* AC — синус */}
      <path d="M14.1 13.6c.7-3.2 1.9-3.2 2.6 0s1.9 3.2 2.6 0" />
      {/* Клеми знизу — те, що робить це силовим приладом, а не екраном */}
      <path d="M8.2 18.8v2M15.8 18.8v2" />
    </svg>
  );
}
