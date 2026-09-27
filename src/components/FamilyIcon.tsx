/**
 * Small, original glyphs used as the card illustration's centerpiece, one per
 * card family. Deliberately abstract/generic - not a reproduction of any
 * Guild Wars game icon.
 */
export function FamilyIcon({ family, className }: { family: string; className?: string }) {
  switch (family) {
    case "SKILL":
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="32" cy="32" r="14" />
          <path d="M32 6v10M32 48v10M6 32h10M48 32h10M14 14l7 7M43 43l7 7M50 14l-7 7M21 43l-7 7" />
        </svg>
      );
    case "BOSS":
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 30c0-11 9-20 20-20s20 9 20 20v10a6 6 0 0 1-6 6h-2l-3 8-4-8h-10l-4 8-3-8h-2a6 6 0 0 1-6-6z" />
          <circle cx="24" cy="28" r="3" fill="currentColor" stroke="none" />
          <circle cx="40" cy="28" r="3" fill="currentColor" stroke="none" />
          <path d="M8 22l6 4M56 22l-6 4" />
        </svg>
      );
    case "HERO_NPC":
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="32" cy="20" r="10" />
          <path d="M14 54c0-11 8-18 18-18s18 7 18 18" />
        </svg>
      );
    case "LOCATION":
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M32 8c-10 0-18 8-18 18 0 13 18 30 18 30s18-17 18-30c0-10-8-18-18-18z" />
          <circle cx="32" cy="26" r="6" />
        </svg>
      );
    case "ITEM":
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M32 8l20 12v24L32 56 12 44V20z" />
          <path d="M12 20l20 12 20-12M32 32v24" />
        </svg>
      );
    case "WEAPON":
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M10 10l20 20M30 30l-6 14 4 4 14-6M30 30l14-14M44 16l4-8 8-4-4 8z" />
          <circle cx="14" cy="14" r="3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "LORE":
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 12h16a6 6 0 0 1 6 6v34a5 5 0 0 0-5-5H12z" />
          <path d="M52 12H36a6 6 0 0 0-6 6v34a5 5 0 0 1 5-5h17z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="32" cy="32" r="18" />
        </svg>
      );
  }
}
