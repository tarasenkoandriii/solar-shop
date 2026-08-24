import type { SVGProps } from "react";

export function BatteryIcon(props: SVGProps<SVGSVGElement>) {
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
      <rect x="5.1" y="4.6" width="13.8" height="15.2" rx="2" />
      <path d="M9 2.8h6M9.2 7.7h5.6M9.2 11.1h5.6M9.2 14.5h5.6M9.2 17.9h3.2" />
      <path d="M16.3 2.8v1.8M7.7 2.8v1.8" />
    </svg>
  );
}
