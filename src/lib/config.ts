/**
 * Global feature kill-switches, read from env at request time (not baked in
 * at build time) so they can be flipped via the server's .env + a redeploy
 * without touching code. MARKET_ENABLED defaults to on; set to the literal
 * string "false" to shut the Kamadan down entirely (every auction API route
 * refuses requests, not just the UI hiding links).
 */
export function isMarketEnabled(): boolean {
  return process.env.MARKET_ENABLED !== "false";
}
