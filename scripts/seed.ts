/**
 * Local dev seed: fixture wikitext for a handful of real Guild Wars skills
 * and bosses, run through the exact same parsers as the live wiki sync, so
 * the app is fully testable without outbound network access (this sandbox
 * has none - see scripts/sync-wiki.ts for the real ingestion path).
 *
 * The {{NPC infobox}} fixtures below use field names/quirks confirmed
 * against the live wiki (Arlak Stoneleaf's block is verbatim); the rest are
 * plausible stand-ins in the same format, not claimed to be exact.
 */
import { prisma } from "@/lib/prisma";
import { parseSkill } from "@/lib/wiki/parseSkill";
import { parseNpc } from "@/lib/wiki/parseNpc";
import { parseWeapon } from "@/lib/wiki/parseWeapon";
import { dataBonus, forcedRarityFor, scoreAndRankCardsByFamily } from "@/lib/game/rarity";
import { pageUrl } from "@/lib/wiki/client";
import type { CardFamily, Prisma } from "@prisma/client";

const SKILL_FIXTURES: { title: string; backlinks: number; wikitext: string; imageUrls?: string[] }[] = [
  {
    title: "Meteor Shower",
    backlinks: 210,
    wikitext: `{{Skill infobox
|id=133
|campaign=Nightfall
|profession=Elementalist
|attribute=Fire Magic
|type=Elite Spell
|elite=y
|energy=10
|activation=3
|recharge=20
|description=Meteors strike foes within earshot of target foe, causing {{gr|5|60}} fire damage to all foes within the area of each meteor. This skill deals an additional {{gr|5|55}} damage to foes already knocked down.
|concise description=Deals {{gr|5|60}} fire damage in the area of each meteor to foes within earshot of target foe. Deals extra damage to knocked-down foes.
}}`,
  },
  {
    title: "Distortion",
    backlinks: 95,
    wikitext: `{{Skill infobox
|id=210
|campaign=Core
|profession=Elementalist
|attribute=Energy Storage
|type=Enchantment Spell
|energy=10
|activation={{1/4}}
|recharge=10
|description=For 2...5...6 seconds, you have a 90% chance to avoid attacks made against you. Every time you avoid an attack in this way, you lose 3...2...2 Energy.
|concise description=(2...5...6 seconds.) You have a 90% chance to avoid attacks. You lose 3...2...2 Energy whenever you avoid an attack this way.
}}`,
  },
  {
    title: "Word of Healing",
    backlinks: 260,
    wikitext: `{{Skill infobox
|id=847
|campaign=Nightfall
|profession=Monk
|attribute=Divine Favor
|type=Elite Spell
|elite=y
|energy=5
|activation={{1/4}}
|recharge=2
|description=Target ally is healed for {{gr|30|142}} Health. If target ally is your ally with the lowest percentage of Health, that ally is healed for an additional {{gr|30|142}} Health.
|concise description=Heals target ally for {{gr|30|142}} Health. Heals for an additional {{gr|30|142}} if that ally has the lowest Health percentage in your party.
}}`,
  },
  {
    title: "Healing Signet",
    backlinks: 60,
    imageUrls: ["/card-art/warrior-sample.webp"],
    wikitext: `{{Skill infobox
|id=39
|campaign=Core
|profession=Warrior
|attribute=Tactics
|type=Signet
|activation=1
|recharge=45
|description=Target ally is healed for {{gr|65|145}} Health. You attack 33% slower for 5...15 seconds.
|concise description=Heals target ally for {{gr|65|145}} Health. You attack 33% slower for 5...15 seconds.
}}`,
  },
  {
    title: "Signet of Capture",
    backlinks: 140,
    wikitext: `{{Skill infobox
|id=546
|campaign=Core
|type=Signet
|pve-only=y
|activation=2
|recharge=15
|description=For 30 seconds, the next Elite Skill you use from your Skills and Powers window is captured directly to your skill bar instead of being used.
|concise description=For 30 seconds, capture an elite skill directly into an empty slot in your skill bar.
}}`,
  },
  {
    title: "Barbed Signet",
    backlinks: 20,
    wikitext: `{{Skill infobox
|id=612
|campaign=Factions
|profession=Necromancer
|attribute=Blood Magic
|type=Signet
|activation=1
|recharge=8
|description=Target foe is struck for {{gr|10|46}} damage. You lose 5...1...1 Energy for each condition on that foe.
|concise description=Deals {{gr|10|46}} damage to target foe. You lose Energy for each condition on that foe.
}}`,
  },
  {
    title: "Empathy",
    backlinks: 45,
    wikitext: `{{Skill infobox
|id=88
|campaign=Core
|profession=Mesmer
|attribute=Domination Magic
|type=Hex Spell
|energy=5
|activation=1
|recharge=8
|causes1=Empathy
|description=For 15...31...35 seconds, whenever target foe hits with a physical attack, that foe takes 5...41...50 damage.
|concise description=(15...31...35 seconds.) Deals 5...41...50 damage to target foe whenever it hits with a physical attack.
}}`,
  },
  {
    title: "Read the Wind",
    backlinks: 15,
    wikitext: `{{Skill infobox
|id=333
|campaign=Factions
|profession=Ranger
|attribute=Expertise
|type=Preparation
|energy=5
|activation=2
|recharge=8
|description=For 20 seconds, your arrows move at three times their normal speed and pierce.
|concise description=(20 seconds.) Your arrows move faster and pierce.
}}`,
  },
  {
    title: "Way of the Master",
    backlinks: 10,
    wikitext: `{{Skill infobox
|id=402
|campaign=Factions
|profession=Assassin
|attribute=Critical Strikes
|type=Stance
|energy=5
|activation=1
|recharge=20
|description=For 8...16...20 seconds, your critical hits remove one condition from you.
|concise description=(8...16...20 seconds.) Your critical hits remove a condition from you.
}}`,
  },
  {
    title: "Weapon of Warding",
    backlinks: 55,
    wikitext: `{{Skill infobox
|id=555
|campaign=Factions
|profession=Ritualist
|attribute=Restoration Magic
|type=Elite Binding Ritual
|elite=y
|energy=5
|activation=2
|recharge=6
|description=Level 5...12...14 Spirit. While this spirit is within earshot, whenever an ally is struck by a melee attack, that attack fails, that ally takes no damage, and the attacker is knocked down.
|concise description=Level 5...12...14 spirit. Melee attacks against nearby allies fail and knock down the attacker.
}}`,
  },
  {
    title: "Godspeed",
    backlinks: 12,
    wikitext: `{{Skill infobox
|id=701
|campaign=Nightfall
|profession=Paragon
|attribute=Command
|type=Shout
|energy=5
|activation=0
|recharge=15
|description=For 10 seconds, party members near your target move 33% faster.
|concise description=(10 seconds.) Nearby party members move faster.
}}`,
  },
  {
    title: "Mystic Sweep",
    backlinks: 30,
    wikitext: `{{Skill infobox
|id=733
|campaign=Nightfall
|profession=Dervish
|attribute=Scythe Mastery
|type=Attack Skill
|energy=5
|activation=1
|recharge=8
|description=If this attack hits, you strike for +5...25...30 damage. If target foe is enchanted, this attack hits all adjacent foes.
|concise description=Deals +5...25...30 damage. Hits adjacent foes if target foe is enchanted.
}}`,
  },
];

const BOSS_FIXTURES: { title: string; backlinks: number; wikitext: string }[] = [
  {
    title: "Arlak Stoneleaf",
    backlinks: 40,
    wikitext: `__NOTOC__{{NPC infobox
| image =[[File:Dvalinn Stonebreaker.jpg|150px]]
| type = Dwarf
| affiliation = Stone Summit
| map1 = [[File:Arlak Stoneleaf map.jpg|150px]]
| map1-text = Location in [[Ice Caves of Sorrow]]
| level = 28 (30)
| campaign = Prophecies
| profession = w
| boss = y
}}`,
  },
  {
    title: "Cairn the Berserker",
    backlinks: 65,
    wikitext: `{{NPC infobox
| image = [[File:Jade armor.jpg|200px]]
| affiliation = Mursaat
| type = Jade construct
| profession = w
| profession2 = d
| level = 28 (30)
| boss = y
| campaign = Prophecies
| map1 = [[File:Cairn the Berserker location.jpg|200px]]
| map1-text = Location in [[Divinity Coast (explorable area)]]
}}`,
  },
  {
    title: "Alpha Tyrannus",
    backlinks: 25,
    wikitext: `{{NPC infobox
| type = Dinosaur
| profession = w
| level = 28 (30)
| boss = y
| campaign = Nightfall
| map1-text = Location in [[Tears of the Fallen]]
}}`,
  },
  {
    title: "Aguo Gruffmane",
    backlinks: 18,
    wikitext: `{{NPC infobox
| type = Centaur
| profession = r
| level = 20 (22)
| boss = y
| campaign = Prophecies
| map1-text = Location in [[Regent Valley]]
}}`,
  },
  {
    title: "Annihilator Golem",
    backlinks: 22,
    wikitext: `{{NPC infobox
| type = Golem
| profession = e
| level = 26 (28)
| boss = y
| campaign = Prophecies
| map1-text = Location in [[Iron Mines of Moladune]]
}}`,
  },
  {
    title: "Zho the Unshackled",
    backlinks: 8,
    wikitext: `{{NPC infobox
| type = Human
| affiliation = Jade Brotherhood
| profession = a
| level = 20 (22)
| boss = y
| campaign = Factions
| map1-text = Location in [[Zen Daijun (mission)]]
}}`,
  },
];

// Green/unique weapons (fixed stats, unique=yes) and generic skins (random
// white/blue/purple/gold drops in-game, no rarity signal on the wiki page
// itself). Format confirmed against live wiki pages (Droknar's Sword, Fiery
// Dragon Sword) - see project notes.
const WEAPON_FIXTURES: { title: string; backlinks: number; wikitext: string }[] = [
  {
    title: "Droknar's Sword",
    backlinks: 55,
    wikitext: `{{Weapon infobox
| type = [[sword]]
| campaign = [[Eye of the North]]
| attribute = [[Swordsmanship]]
| damagetype = [[Slashing damage]]
| unique = yes
}}

==Stats==
*Slashing damage: 15-22 (Requires 9 Swordsmanship)
*Health +30
*Armor +10 (vs. piercing damage)

==Skin==
A silver blade etched with Deldrimor runes.`,
  },
  {
    title: "Kaolai Grasping Axe",
    backlinks: 22,
    wikitext: `{{Weapon infobox
| type = [[axe]]
| campaign = [[Factions]]
| attribute = [[Axe Mastery]]
| damagetype = [[Slashing damage]]
| unique = yes
}}

==Stats==
*Slashing damage: 6-28 (Requires 9 Axe Mastery)
*Energy +5
*Halves skill recharge of time (Chance 20%)

==Skin==
A jade-inlaid axe of Canthan design.`,
  },
  {
    title: "Gyala's Fire Staff",
    backlinks: 30,
    wikitext: `{{Weapon infobox
| type = [[staff]]
| campaign = [[Nightfall]]
| attribute = [[Fire Magic]]
| damagetype = [[Fire damage]]
| unique = yes
}}

==Stats==
*Fire damage: 11-22 (Requires 9 Fire Magic)
*Energy +5
*Halves casting time of Fire Magic spells (Chance 20%)

==Skin==
A sunstone-tipped staff carved with Sunspear motifs.`,
  },
  {
    title: "Fiery Dragon Sword",
    backlinks: 95,
    wikitext: `{{Weapon infobox
| type = [[Sword]]
| campaign = [[Core]]
| attribute = [[Swordsmanship]]
| damagetype = [[Fire damage]]
| commonsalvage = [[Iron Ingot]]s
| raresalvage = [[Steel Ingot]]s
}}`,
  },
  {
    title: "Totem Axe",
    backlinks: 40,
    wikitext: `{{Weapon infobox
| type = [[Axe]]
| campaign = [[Factions]]
| attribute = [[Axe Mastery]]
| damagetype = [[Slashing damage]]
| commonsalvage = [[Wood Plank]]s
| raresalvage = [[Ironwood Plank]]s
}}`,
  },
  {
    title: "Storm Bow",
    backlinks: 18,
    wikitext: `{{Weapon infobox
| type = [[Bow]]
| campaign = [[Core]]
| attribute = [[Marksmanship]]
| damagetype = [[Piercing damage]]
| commonsalvage = [[Wood Plank]]s
| raresalvage = [[Ironwood Plank]]s
}}`,
  },
];

function skillExtract(parsed: NonNullable<ReturnType<typeof parseSkill>>): string {
  return parsed.conciseDescription || parsed.description || "Skill.";
}

function npcExtract(parsed: NonNullable<ReturnType<typeof parseNpc>>): string {
  const kind = parsed.isBoss ? "Boss" : "Monster";
  const level = parsed.hardModeLevel
    ? `level ${parsed.level} (${parsed.hardModeLevel} in Hard Mode)`
    : parsed.level
      ? `level ${parsed.level}`
      : null;
  const parts = [
    [kind, parsed.species, level].filter(Boolean).join(" "),
    parsed.affiliation ? `Affiliated with ${parsed.affiliation}.` : null,
    parsed.locationText ? `Found: ${parsed.locationText}.` : null,
    parsed.campaign ? `Campaign: ${parsed.campaign}.` : null,
  ];
  return parts.filter(Boolean).join(" ");
}

function weaponExtract(parsed: NonNullable<ReturnType<typeof parseWeapon>>): string {
  if (!parsed.isUnique) {
    const parts = [parsed.weaponType, parsed.damageType?.toLowerCase() ?? null];
    return `Weapon (${parts.filter(Boolean).join(", ")}).`;
  }
  const parts: string[] = [`Unique ${parsed.weaponType ?? "weapon"}.`];
  if (parsed.damageMin !== null && parsed.requirement !== null) {
    parts.push(
      `Damage ${parsed.damageMin}-${parsed.damageMax} (requires ${parsed.requirement} ${parsed.profession ?? ""}).`.trim(),
    );
  }
  if (parsed.bonuses.length) parts.push(parsed.bonuses.slice(0, 2).join(" "));
  return parts.join(" ");
}

async function seedFamily<T extends { campaign?: string | null; profession?: string | null }>(
  fixtures: { title: string; backlinks: number; wikitext: string; imageUrls?: string[] }[],
  family: CardFamily,
  parsePage: (wikitext: string, title: string) => T | null,
  buildExtract: (parsed: T) => string,
) {
  let revisionId = 1;
  for (const fixture of fixtures) {
    const parsed = parsePage(fixture.wikitext, fixture.title);
    if (!parsed) {
      console.warn(`Fixture failed to parse, skipping: ${fixture.title}`);
      continue;
    }

    const wikiPage = await prisma.wikiPage.upsert({
      where: { title: fixture.title },
      create: {
        title: fixture.title,
        url: pageUrl(fixture.title),
        revisionId: revisionId++,
        categories: [`Category:${family === "SKILL" ? "Skills" : "Bosses"}`],
        extract: buildExtract(parsed),
        imageUrls: fixture.imageUrls ?? [],
        backlinks: fixture.backlinks,
        contentLength: fixture.wikitext.length,
      },
      update: {
        extract: buildExtract(parsed),
        imageUrls: fixture.imageUrls ?? [],
        backlinks: fixture.backlinks,
        contentLength: fixture.wikitext.length,
        syncedAt: new Date(),
      },
    });

    await prisma.card.upsert({
      where: { wikiPageId_variantKey: { wikiPageId: wikiPage.id, variantKey: "DEFAULT" } },
      create: {
        wikiPageId: wikiPage.id,
        family,
        campaign: parsed.campaign ?? null,
        profession: parsed.profession ?? null,
        attributes: { ...parsed } as Prisma.InputJsonValue,
      },
      update: {
        campaign: parsed.campaign ?? null,
        profession: parsed.profession ?? null,
        attributes: { ...parsed } as Prisma.InputJsonValue,
      },
    });
  }
}

async function recomputeRarity() {
  const cards = await prisma.card.findMany({ include: { wikiPage: true } });
  const inputs = cards.map((card) => {
    const attrs = card.attributes as Record<string, unknown>;
    const traits = { isElite: Boolean(attrs.isElite), isBoss: Boolean(attrs.isBoss), isUniqueGreenItem: Boolean(attrs.isUnique) };
    return {
      id: card.id,
      family: card.family,
      backlinks: card.wikiPage.backlinks,
      wikitextLength: card.wikiPage.contentLength,
      bonus: dataBonus(traits),
      forcedRarity: forcedRarityFor(traits),
    };
  });
  const scored = scoreAndRankCardsByFamily(inputs);
  for (const s of scored) {
    // Admin-locked cards keep their hand-set rarity (score still refreshes).
    await prisma.card.updateMany({ where: { id: s.id, rarityLocked: false }, data: { score: s.score, rarity: s.rarity } });
    await prisma.card.updateMany({ where: { id: s.id, rarityLocked: true }, data: { score: s.score } });
  }
  console.log(`Rarity assigned for ${scored.length} cards.`);
}

async function main() {
  console.log("Seeding skills...");
  await seedFamily(SKILL_FIXTURES, "SKILL", parseSkill, skillExtract);
  console.log("Seeding bosses...");
  await seedFamily(BOSS_FIXTURES, "BOSS", parseNpc, npcExtract);
  console.log("Seeding weapons...");
  await seedFamily(WEAPON_FIXTURES, "WEAPON", parseWeapon, weaponExtract);
  await recomputeRarity();
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
