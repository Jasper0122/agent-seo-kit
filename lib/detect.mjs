/**
 * Read one AI answer and decide three things: were we named, were we
 * recommended, was our page cited.
 *
 * Two of those are deterministic and one is a guess. Keeping that distinction
 * visible is the entire design of this file, because a recommendation detector
 * that quietly reports a number nobody audits will report a wrong one for
 * months. `mentioned` and `cited` can be trusted; `recommended` ships with the
 * text that triggered it so a person can overrule it.
 */

/**
 * Cues that plausibly express endorsement.
 *
 * Deliberately short. The obvious wider set (a bare "use", "try", "with") fires
 * on ordinary description: "a pay per use tool", "how to use it", "works with
 * Python". Every one of those produced a false positive in testing, and a
 * detector that is generous here reports endorsement where the answer was
 * merely explaining what a thing is.
 */
const RECOMMENDATION_CUES = [
  'recommend', 'best choice', 'best option', 'best bet', 'top pick',
  'i would go with', 'go with', 'your best', 'the strongest option',
  'is the way to go', 'i suggest', 'we suggest', 'should choose', 'opt for',
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case insensitive, whole word where the term is word shaped. */
function findAll(haystack, needle) {
  const body = escape(needle);
  const pattern = /^[\w\s-]+$/.test(needle) ? `\\b${body}\\b` : body;
  const re = new RegExp(pattern, 'gi');
  const hits = [];
  let m;
  while ((m = re.exec(haystack)) !== null) hits.push(m.index);
  return hits;
}

export const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};

/**
 * @param answer   the answer text
 * @param citations array of URLs (or objects carrying a url)
 * @param cfg      the loaded config
 * @param dictionary array of { name, aliases[], domain } competitors
 */
export function detect(answer, citations, cfg, dictionary = []) {
  const text = String(answer ?? '');
  const urls = (citations ?? [])
    .map((c) => (typeof c === 'string' ? c : c?.url))
    .filter(Boolean);
  const hosts = urls.map(hostOf).filter(Boolean);

  const brandTerms = [
    cfg.site.brandName ?? cfg.site.domain.split('.')[0],
    ...(cfg.site.brandTerms ?? []),
  ].filter(Boolean);

  const mentionOffsets = brandTerms.flatMap((t) => findAll(text, t));
  const mentioned = mentionOffsets.length > 0;

  // Cited is a domain test, not a text test. A page of ours in the source list
  // is the closest thing an answer engine has to a backlink, and it is the one
  // signal a published page moves directly.
  const ourDomain = cfg.site.domain.toLowerCase();
  const citedUrls = urls.filter((u) => {
    const h = hostOf(u);
    return h && (h === ourDomain || h.endsWith(`.${ourDomain}`));
  });

  // Recommendation: a cue must sit inside a narrow window around our name.
  // The window is narrow on purpose. Widen it and unrelated sentences in the
  // same paragraph start counting as endorsement of us.
  const window = cfg.geo.recommendationWindow ?? 240;
  const recommendationEvidence = [];
  for (const offset of mentionOffsets) {
    const from = Math.max(0, offset - window);
    const slice = text.slice(from, offset + window);
    for (const cue of RECOMMENDATION_CUES) {
      if (slice.toLowerCase().includes(cue)) {
        recommendationEvidence.push({ cue, excerpt: slice.trim() });
        break;
      }
    }
  }

  const competitors = [];
  for (const entry of dictionary) {
    const names = [entry.name, ...(entry.aliases ?? [])].filter(Boolean);
    const named = names.some((n) => findAll(text, n).length > 0);
    const citedHere = entry.domain
      ? hosts.filter((h) => h === entry.domain || h.endsWith(`.${entry.domain}`)).length
      : 0;
    if (named || citedHere) {
      competitors.push({ name: entry.name, named, citations: citedHere });
    }
  }

  return {
    mentioned,
    cited: citedUrls.length > 0,
    citedUrls,
    // Never reported as a rate without reading the evidence. See the skill.
    recommended: recommendationEvidence.length > 0,
    recommendationEvidence,
    competitors,
    citations: urls,
    citedHosts: [...new Set(hosts)],
  };
}

export { RECOMMENDATION_CUES };
