/**
 * HTTP client for the Guild Wars 1 wiki's MediaWiki API.
 * Ported from the rate-limited client already proven in guild-wars-build/src/scraper/wiki_client.py.
 */

const WIKI_API_URL = process.env.WIKI_API_URL ?? "https://wiki.guildwars.com/api.php";
const REQUEST_DELAY_MS = Number(process.env.WIKI_REQUEST_DELAY_MS ?? 1000);
const USER_AGENT =
  process.env.WIKI_USER_AGENT ?? "GuildMasters/0.1 (https://github.com/your-repo; contact@example.com)";

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CategoryMembersResponse {
  query: { categorymembers: { title: string }[] };
  continue?: { cmcontinue: string };
}

interface ParseResponse {
  parse?: {
    wikitext: { "*": string };
    revid: number;
    categories?: { "*": string }[];
  };
}

interface BacklinksResponse {
  query: { backlinks: unknown[] };
}

export class WikiClient {
  private lastRequestAt = 0;

  private async throttle() {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < REQUEST_DELAY_MS) {
      await sleep(REQUEST_DELAY_MS - elapsed);
    }
    this.lastRequestAt = Date.now();
  }

  private async get<T>(params: Record<string, string>): Promise<T> {
    const url = new URL(WIKI_API_URL);
    for (const [key, value] of Object.entries({ format: "json", ...params })) {
      url.searchParams.set(key, value);
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await this.throttle();
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) {
        return res.json();
      }
      if (res.status === 429 || res.status >= 500) {
        const wait = BACKOFF_BASE_MS * 2 ** attempt;
        console.warn(`HTTP ${res.status} for ${url} - retrying in ${wait}ms`);
        await sleep(wait);
        continue;
      }
      throw new Error(`Wiki API error ${res.status} for ${url}`);
    }
    throw new Error(`Failed after ${MAX_RETRIES} retries: ${JSON.stringify(params)}`);
  }

  /** All page titles in a category (namespace 0 only), following continuation. */
  async getCategoryMembers(category: string): Promise<string[]> {
    const titles: string[] = [];
    const params: Record<string, string> = {
      action: "query",
      list: "categorymembers",
      cmtitle: category,
      cmnamespace: "0",
      cmlimit: "50",
    };
    for (;;) {
      const data = await this.get<CategoryMembersResponse>(params);
      for (const member of data.query.categorymembers) {
        titles.push(member.title);
      }
      if (!data.continue) break;
      params.cmcontinue = data.continue.cmcontinue;
    }
    return titles;
  }

  /** Raw wikitext for a page, its current revision id, and its categories. */
  async getPage(title: string): Promise<{ wikitext: string; revisionId: number; categories: string[] } | null> {
    const data = await this.get<ParseResponse>({
      action: "parse",
      page: title,
      prop: "wikitext|revid|categories",
    });
    const parse = data?.parse;
    if (!parse?.wikitext) return null;
    return {
      wikitext: parse.wikitext["*"],
      revisionId: parse.revid,
      categories: (parse.categories ?? []).map((c) => c["*"]),
    };
  }

  /**
   * Approximate backlink count, capped at `limit`. A single request is enough for
   * rarity normalization purposes - we don't need the exact count for very popular pages.
   */
  async getBacklinksCount(title: string, limit = 500): Promise<number> {
    const data = await this.get<BacklinksResponse>({
      action: "query",
      list: "backlinks",
      bltitle: title,
      bllimit: String(limit),
      blnamespace: "0",
    });
    return data.query.backlinks.length;
  }
}

export function pageUrl(title: string): string {
  return `https://wiki.guildwars.com/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}
