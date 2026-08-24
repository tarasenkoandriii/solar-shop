import type { SVGProps } from "react";

export function SolarPanelIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M4.2 15.7 7 5.3h12.8l-2.7 10.4H4.2Z" />
      <path d="M7 8.1h12.1M6.2 11.1h12.1M5.4 14.1h12" />
      <path d="m10.1 5.3-2.7 10.4M14.3 5.3l-2.7 10.4M18.5 5.3l-2.7 10.4" />
      <path d="M9.3 15.7 7.6 19.1M16.7 15.7l.7 3.4M6.4 19.1h12.3" />
    </svg>
  );
}
