import type { SVGProps } from "react";

export function ControllerIcon(props: SVGProps<SVGSVGElement>) {
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
      <rect x="3.5" y="4.1" width="17" height="15.8" rx="2.2" />
      <path d="M7.1 8.2h9.8v4.1H7.1z" />
      <path d="M9.1 15.8h.1M12 15.8h.1M14.9 15.8h.1" />
      <path d="M10.8 10.2 9.7 12h1.7l-.7 2.1 2.5-3h-1.7l.8-.9" />
      <path d="M3.5 8.1H2.4M3.5 12H2.4M3.5 15.9H2.4M20.5 8.1h1.1M20.5 12h1.1M20.5 15.9h1.1" />
    </svg>
  );
}
