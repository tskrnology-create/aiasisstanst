// Bağımlılıksız, satır içi SVG ikonlar. Tüm ikonlar metin rengini devralır.

interface IconProps {
  className?: string;
}

const base = "h-4 w-4";

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? base}
    >
      {children}
    </svg>
  );
}

export function IconBuilding(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
      <path d="M15 9h3a2 2 0 0 1 2 2v10" />
      <path d="M3 21h18" />
      <path d="M8 7h3M8 11h3M8 15h3" />
    </Svg>
  );
}

export function IconSparkles(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15z" />
    </Svg>
  );
}

export function IconImage(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l4.5-4.2a2 2 0 0 1 2.7 0L16 17" />
      <path d="M14.5 15.5l1.6-1.5a2 2 0 0 1 2.6 0L21 15.5" />
    </Svg>
  );
}

export function IconCalendar(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}

export function IconLibrary(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 5h4v14H4zM10 5h4v14h-4z" />
      <path d="M16.5 5.6l3.3 1-3.4 12.4-3.3-1" />
    </Svg>
  );
}

export function IconCopy(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 6.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1.5" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 12.5l4.5 4.5L19.5 6.5" />
    </Svg>
  );
}

export function IconExternal(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 4h6v6" />
      <path d="M20 4l-8.5 8.5" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </Svg>
  );
}

export function IconSend(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 3L10.5 13.5" />
      <path d="M21 3l-6.8 18-3.7-7.5L3 9.8 21 3z" />
    </Svg>
  );
}

export function IconClock(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function IconAlert(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.4h.01" />
    </Svg>
  );
}

export function IconInfo(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.6h.01" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

export function IconDownload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v11" />
      <path d="M8 11.5l4 4 4-4" />
      <path d="M5 19h14" />
    </Svg>
  );
}

export function IconRefresh(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4h-4" />
    </Svg>
  );
}

export function IconArrowLeft(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Svg>
  );
}

export function IconArrowRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </Svg>
  );
}

export function IconLogout(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h9" />
    </Svg>
  );
}

export function IconSun(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </Svg>
  );
}

export function IconMoon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </Svg>
  );
}

export function IconWand(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20L14 10" />
      <path d="M16 4l1 2.5L19.5 7.5 17 8.5 16 11l-1-2.5L12.5 7.5 15 6.5 16 4z" />
      <path d="M6.5 5l.7 1.6L9 7.3l-1.8.7-.7 1.6L5.8 8 4 7.3l1.8-.7L6.5 5z" />
    </Svg>
  );
}

export function IconLayers(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" />
      <path d="M4 12.5l8 4.5 8-4.5" />
      <path d="M4 17l8 4.5 8-4.5" />
    </Svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconMusic(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </Svg>
  );
}

export function IconVideo(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="M16 10.5l5-3v9l-5-3" />
    </Svg>
  );
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </Svg>
  );
}
