/**
 * The one file a user of this kit has to fill in.
 *
 * Everything downstream is derived from it: which domain is ours, which
 * domains we are measured against, which terms are brand navigation and must
 * never be treated as a content opportunity, and how much of a paid report we
 * are willing to buy per run.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson, die } from './io.mjs';

const CONFIG_PATH = process.env.SEO_KIT_CONFIG ?? join(ROOT, 'seo.config.json');

const DEFAULTS = {
  source: 'ahrefs',
  site: { domain: '', brandTerms: [], country: 'us' },
  competitors: [],
  limits: { rowsPerDomain: 50, minVolume: 50, maxSpendPerRunUsd: 10 },
  bands: { head: [1, 3], striking: [4, 20], depth: [21, 60] },
  geo: {
    provider: 'blockrun.ai',
    endpoint: '/api/v1/exa/answer',
    gapSeconds: 1.5,
    recommendationWindow: 240,
  },
  excludeKeywordPatterns: [],
  outreach: { platformHosts: [], directoryHosts: [], partnerHosts: [] },
};

const merge = (base, over) => {
  if (Array.isArray(over) || over === null || typeof over !== 'object') return over ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = merge(base?.[k], v);
  return out;
};

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    die(
      `no config at ${CONFIG_PATH}\n` +
      '  cp seo.config.example.json seo.config.json, then fill in your domain,\n' +
      '  your brand terms and the competitors you actually compete with.',
    );
  }
  const cfg = merge(DEFAULTS, readJson(CONFIG_PATH));
  if (!cfg.site.domain) die('seo.config.json needs site.domain');
  if (!['ahrefs', 'semrush'].includes(cfg.source)) {
    die(`unknown source "${cfg.source}". Use "ahrefs" or "semrush".`);
  }
  return cfg;
}

/**
 * Brand navigation, near typos of the brand, and anything the user blocklisted.
 *
 * A young domain's organic footprint is mostly its own name. Left in, brand
 * terms dominate every ranking and every average, and the pipeline spends its
 * budget writing articles for people who were already looking for you.
 */
export function isBrandOrNoise(keyword, cfg) {
  const k = String(keyword).toLowerCase().trim();
  if (!k) return true;
  const brand = [cfg.site.domain.split('.')[0], ...(cfg.site.brandTerms ?? [])]
    .map((t) => String(t).toLowerCase())
    .filter(Boolean);
  if (brand.some((b) => k.includes(b))) return true;
  const oneToken = !/\s/.test(k);
  if (oneToken && brand.some((b) => k.length <= b.length + 3 && levenshtein(k, b) <= 2)) return true;
  return (cfg.excludeKeywordPatterns ?? []).some((p) => k.includes(String(p).toLowerCase()));
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}

export { CONFIG_PATH };
