/**
 * One keyword row shape, two possible suppliers.
 *
 * Ahrefs and Semrush both answer "what does this domain rank for", with
 * different field names, different types (Semrush returns every number as a
 * string) and a 36x price difference per row. The rest of the kit should not
 * know or care which one is configured, so the difference is absorbed here.
 *
 *   ahrefs   /site-explorer/organic-keywords   $0.072 per row, max 100 per call
 *   semrush  /domain_organic                   $0.002 per row, max 10,000 per call
 *
 * Ahrefs is the default because it is the wider of the two entitlements and it
 * is the only one of the pair that can also answer the AI visibility question
 * (see scripts/ai-visibility.mjs). Switch `source` to "semrush" when the row
 * budget matters more than the extra report.
 */
import { run, costOf } from './monid.mjs';
import { today } from './io.mjs';

/** Price per returned row, so a dry run can quote a number before spending. */
export const PRICE_PER_ROW = { ahrefs: 0.072, semrush: 0.002 };

/** Ahrefs caps a single call at 100 rows; Semrush allows far more. */
export const MAX_ROWS = { ahrefs: 100, semrush: 10_000 };

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function normalise(source, row) {
  if (source === 'ahrefs') {
    return {
      keyword: row.keyword ?? '',
      position: num(row.best_position) || 999,
      volume: num(row.volume),
      // Ahrefs reports CPC in cents, Semrush in dollars. Normalise to dollars.
      cpc: num(row.cpc) / 100,
      url: row.best_position_url ?? '',
      traffic: num(row.sum_traffic),
    };
  }
  return {
    keyword: row.keyword ?? '',
    position: num(row.position) || 999,
    volume: num(row.searchVolume),
    cpc: num(row.cpc),
    url: row.url ?? '',
    // Semrush reports a share of the domain's traffic, not an absolute count.
    traffic: num(row.trafficPercent),
  };
}

/** Find the row array wherever the provider decided to nest it. */
function extractRows(output) {
  if (Array.isArray(output)) return output;
  if (Array.isArray(output?.rows)) return output.rows;
  if (output && typeof output === 'object') {
    for (const value of Object.values(output)) {
      const found = extractRows(value);
      if (found?.length) return found;
    }
  }
  return [];
}

/**
 * Pull the organic keywords a domain ranks for, newest data, sorted by the
 * traffic they actually send.
 *
 * Sorting by traffic rather than by volume is not a detail. Volume-sorted
 * pulls return the mega terms at the top of the category, which nobody in a
 * normal competitive position could rank for; traffic-sorted returns what is
 * really sending that domain visitors, which is the set worth competing over.
 */
export async function pullOrganic(domain, cfg, { limit } = {}) {
  const rows = Math.min(limit ?? cfg.limits.rowsPerDomain, MAX_ROWS[cfg.source]);

  const record = cfg.source === 'ahrefs'
    ? await run('ahrefs', '/site-explorer/organic-keywords', {
      queryParams: {
        target: domain,
        date: today(),
        country: cfg.site.country,
        mode: 'subdomains',
        limit: rows,
        order_by: 'sum_traffic:desc',
      },
    })
    : await run('semrush', '/domain_organic', {
      queryParams: {
        domain,
        database: cfg.site.country,
        display_limit: rows,
        display_sort: 'tr_desc',
      },
    });

  return {
    domain,
    source: cfg.source,
    pulledAt: new Date().toISOString(),
    cost: costOf(record),
    rows: extractRows(record.output).map((r) => normalise(cfg.source, r)),
  };
}

/** Rough cost of a planned pull, for `--dry-run`. */
export const quote = (cfg, domains) =>
  domains.length * Math.min(cfg.limits.rowsPerDomain, MAX_ROWS[cfg.source]) * PRICE_PER_ROW[cfg.source];
