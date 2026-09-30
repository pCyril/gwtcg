# GWTCG

A free, fan-made **Guild Wars 1 trading card game** in the browser. Open boosters, build your collection, trade cards with other players, bid on them at the Kamadan auction house, and help illustrate the cards.

Every card is generated from the [Guild Wars Wiki](https://wiki.guildwars.com): skills, bosses, heroes and NPCs, locations, items, weapon skins and lore pages.

> **Unofficial.** GWTCG is a fan project, not affiliated with ArenaNet or NCSoft. Guild Wars is a trademark of ArenaNet / NCSoft. Card texts are adapted from the Guild Wars Wiki under the GNU FDL.

## Features

- **Boosters**: 5 cards per standard booster, refilled in a batch one hour after your last opening, plus a free profession booster when you pick your starting profession. Draws use a server-side crypto RNG, and each standard booster guarantees at least one uncommon-or-better card.
- **Collection**: filter by family, rarity, campaign and profession, sort by date, family, rarity, rarity rate or number of copies. Share a read-only link to your collection.
- **Rarity**: six tiers (Common to Mythic), assigned from wiki data (backlinks, page length, in-game traits). Every card shows how many copies have dropped so far.
- **Trading**: propose trades to other registered players, straight from their shared collection.
- **Kamadan**: an auction house with bids and buyouts (can be switched off with `MARKET_ENABLED=false`).
- **Community art**: players submit illustrations for cards, admins moderate them, and the home page tracks the community's progress and top illustrators.
- **Leaderboards**: most complete collections and top illustrators.
- **Guest accounts**: created on your first booster, upgradable to a full account (guests can't trade).
- **Bilingual**: French and English.

## Tech stack

Next.js (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL 16 · Prisma 7.

> This repo uses a recent Next.js with breaking changes. Check `node_modules/next/dist/docs/` before changing framework-level code (see `AGENTS.md`).

## Getting started

Requirements: Node.js 22, Docker (for PostgreSQL).

```bash
git clone https://github.com/pCyril/gwtcg.git
cd gwtcg
npm install

cp .env.example .env            # then adjust if needed
docker compose up -d            # PostgreSQL on localhost:5442
docker compose exec db psql -U guildmasters -d guildmasters -c "CREATE DATABASE shadow_check;"
npm run db:migrate              # apply migrations (prisma migrate dev, uses the shadow DB)

npm run db:seed                 # a handful of fixture cards, works offline
# or import the real cards from the wiki (about 9,000, takes a while, 1 request/s):
npm run sync:wiki

npm run dev                     # http://localhost:3000
```

The booster and card-back artwork is not part of this repo (`public/card-art/` is git-ignored). Drop your own `card-back.jpg` and `pack-wrapper.webp` in that folder, otherwise those two images show up broken.

`sync:wiki` also accepts `-- --only=skills|bosses|heroes|weapons|locations|items|lore` to import a single family.

### Configuration

All settings live in `.env` (see `.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. |
| `SHADOW_DATABASE_URL` | Scratch database, only needed for `prisma migrate dev`. |
| `ADMIN_EMAIL` | The account registered with this email becomes admin (art moderation queue, stats). |
| `MARKET_ENABLED` | Set to `false` to disable new auctions and bids. |
| `WIKI_API_URL`, `WIKI_REQUEST_DELAY_MS`, `WIKI_USER_AGENT` | Wiki sync. Set a real user agent with a contact address before syncing. |
| `RARITY_SHARE_*` | Target share of each rarity tier, used for classification and booster draws. They are renormalized, so they don't need to sum to 1. |

### Useful commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Project layout

```
src/app/          Pages and API routes (App Router)
src/components/   UI components
src/lib/game/     Game rules: boosters, rarity, trades, auctions, leaderboards
src/lib/wiki/     Wiki client and page parsers (one per card family)
src/lib/i18n/     French / English translations
prisma/           Schema and migrations
scripts/          Wiki sync and dev seed
deploy/           Production compose file, nginx config and deploy script
```

## Deployment

The app ships as a Docker image (`Dockerfile`). `deploy/` contains a production `docker-compose.prod.yml`, an nginx reverse-proxy example and the deploy script, and `.github/workflows/deploy.yml` builds and publishes the image on every push to `main`. Uploaded illustrations are stored on a volume mounted at `/app/public/uploads`.

## Contributing

Issues and pull requests are welcome. Before opening a PR, run `npm run lint` and `npx tsc --noEmit`. Player-facing changes also need a bullet in both the `fr` and `en` lists of `src/lib/changelog.ts`.

## License

The code is released under the [MIT License](LICENSE). Card texts imported from the Guild Wars Wiki remain under the GNU FDL, and Guild Wars content belongs to ArenaNet / NCSoft.
