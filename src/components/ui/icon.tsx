import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

const paths: Record<string, React.ReactNode> = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  "chevron-up": <path d="M6 15l6-6 6 6" />,
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "arrow-right": <path d="M4 12h16M14 6l6 6-6 6" />,
  "arrow-left": <path d="M20 12H4M10 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l5 5" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16.5 9.5" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.8a2.2 2.2 0 0 1 3.1 3.1L7.5 19 3 20l1-4.5L16.5 3.8z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7.5" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17.5" cy="9" r="2.8" />
      <path d="M16 15.3a5.5 5.5 0 0 1 5.5 4.7" />
    </>
  ),
  settings: (
    <>
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />
      <path d="M12 2.5v3M12 18.5v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2.5 12h3M18.5 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9a2.9 2.9 0 0 1 5.6.9c0 1.9-2.8 2.2-2.8 4" />
      <path d="M12 17.5v.1" />
    </>
  ),
  play: <path d="M7 5.5v13l11-6.5z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  timeline: (
    <>
      <path d="M4 17h6M11 7h9M4 7h3" />
      <circle cx="17" cy="17" r="2.2" />
      <circle cx="14" cy="7" r="2.2" />
    </>
  ),
  gradient: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M21 12h-4M21 15h-6M21 18h-8M12 21v-6M9 21v-9" />
    </>
  ),
  chain: (
    <>
      <path d="M9.5 14.5l5-5" />
      <path d="M10.6 6.6l1.4-1.4a4.2 4.2 0 0 1 6 6l-1.4 1.4" />
      <path d="M13.4 17.4l-1.4 1.4a4.2 4.2 0 0 1-6-6l1.4-1.4" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z" />
    </>
  ),
  calculate: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 12h.01M12 12h.01M15 12h.01M9 15.5h.01M12 15.5h.01M15 15.5h.01M9 18.5h6" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
    </>
  ),
  infinity: (
    <>
      <path d="M6.5 9.5c-2 0-3.5 1.2-3.5 2.5s1.5 2.5 3.5 2.5c4.2 0 4.8-5 9-5 2 0 3.5 1.2 3.5 2.5s-1.5 2.5-3.5 2.5c-4.2 0-4.8-5-9-5z" />
    </>
  ),
  orbit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="9" ry="4" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z" />
      <path d="M4 5.5A2.5 2.5 0 0 0 6.5 8H20" />
    </>
  ),
  quiz: (
    <>
      <path d="M6 3h9l5 5v13H6z" />
      <path d="M15 3v5h5M9.5 12.5h.01M13 12.5h.01M16.5 12.5h.01M9.5 16h.01M13 16h.01M16.5 16h.01" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5A3.5 3.5 0 0 1 15.5 11M12 13v4M8 21h8M9 17h6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  trend_up: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  "bar-chart": (
    <>
      <path d="M4 20V10M10 20V4M16 20v-8M21 20H3" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
    </>
  ),
  functions: (
    <>
      <path d="M7 4h10" />
      <path d="M10 4v16M10 10h7M10 16h7" />
    </>
  ),
  school: (
    <>
      <path d="M3 9.5l9-5 9 5-9 5z" />
      <path d="M7 12v5a5 5 0 0 0 10 0v-5M21 9.5V16" />
    </>
  ),
  shield: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />,
  tune: (
    <>
      <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="8" cy="16" r="2" />
    </>
  ),
  monitoring: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 15l3-4 3 3 4-6" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18.5 9A7 7 0 0 0 6.3 6.3L4 9.5M5.5 15A7 7 0 0 0 17.7 17.7L20 14.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  flame: (
    <path d="M12 3s6 4.5 6 10a6 6 0 0 1-12 0c0-2 1-3.5 1-3.5 1.5 1.8 3.5 2 3.5 2 0-4-1.5-6.5-1.5-6.5S12 5.5 12 3z" />
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.8 14.5L7 22l5-3 5 3-1.8-7.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  gauge: (
    <>
      <path d="M4.5 15a8 8 0 1 1 15 0" />
      <path d="M12 15l4-5" />
      <path d="M8 18a3.4 3.4 0 0 1 8 0M9.5 18h5" />
    </>
  ),
  filter: <path d="M4 5h16l-6 7v5l-4 2v-7z" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4L11 13" />
      <path d="M19 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  password: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M4 4l16 16" />
      <path d="M10.5 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17.4 17.4 0 0 1-3.4 4.2M6.7 8.3A17 17 0 0 0 2 12s3.5 6 10 6c1.2 0 2.3-.2 3.3-.6" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3l10 17H2z" />
      <path d="M12 9v5M12 17.5v.1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7v.1" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />,
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
      <path d="M3 17.5l9 5 9-5" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  send: (
    <>
      <path d="M21 3L10 14" />
      <path d="M21 3l-7 18-4-7-7-4z" />
    </>
  ),
  document: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  clock_undo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 8.5v4H11" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 8.5v4H11" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  save: (
    <>
      <path d="M15.2 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.8L15.2 3z" />
      <path d="M14 3v6H6" />
      <path d="M9 15h6M9 11h6" />
    </>
  ),
  task_alt: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16.5 9.5" />
    </>
  ),
  auto_awesome: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z" />
    </>
  ),
  menu_book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z" />
      <path d="M4 5.5A2.5 2.5 0 0 0 6.5 8H20" />
    </>
  ),
  login: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </>
  ),
  memory: (
    <>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.6-2.4A1 1 0 0 1 9.5 5h5a1 1 0 0 1 .9.6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  accuracy_feedback: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
};

export type IconName = keyof typeof paths;

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** Ikon garis tipis bergaya Material Symbols (default). */
export function Icon({ name, size = 20, className, strokeWidth = 1.7, ...rest }: IconProps) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("inline-block shrink-0", className)}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
