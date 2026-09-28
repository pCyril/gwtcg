import { Zap, Skull, UserRound, MapPin, Package, Swords, BookOpen, Shapes } from "lucide-react";

/**
 * Small lucide-react glyph used as the card illustration's centerpiece when
 * the card has no art yet, one per card family.
 */
export function FamilyIcon({ family, className }: { family: string; className?: string }) {
  switch (family) {
    case "SKILL":
      return <Zap className={className} strokeWidth={2} />;
    case "BOSS":
      return <Skull className={className} strokeWidth={2} />;
    case "HERO_NPC":
      return <UserRound className={className} strokeWidth={2} />;
    case "LOCATION":
      return <MapPin className={className} strokeWidth={2} />;
    case "ITEM":
      return <Package className={className} strokeWidth={2} />;
    case "WEAPON":
      return <Swords className={className} strokeWidth={2} />;
    case "LORE":
      return <BookOpen className={className} strokeWidth={2} />;
    default:
      return <Shapes className={className} strokeWidth={2} />;
  }
}
