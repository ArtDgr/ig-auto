// Retail & promo scrubber.
//
// Stance: 100% unbiased — a post must never read as a paid ad or gratuitous
// advertising for any store or campaign. Mentions of retailers/stores in
// factual, news context are fine (e.g. "available at Best Buy"), but *promo
// copy* — sale-hype, price-off, rewards, buy-now invitations — is stripped
// sentence-by-sentence wherever it enters from source articles.
//
// Coverage of the companies *behind* the tech (Apple, Samsung, Google, Intel…)
// is news, not an ad — the device makers are the subject of the story, not a
// vendor we are promoting.

const PROMO_PHRASES = [
  /\bsale is (?:now )?live\b/i,
  /\bsale now (?:live|on)\b/i,
  /\b(?:anniversary|birthday|flash|clearance|going|closing|boxing|season)\s+sale\b/i,
  /\b\w+\s+(?:massive|huge|giant|epic|mega|big|major|great)\s+sale\b/i,
  /\b(?:massive|huge|giant|epic|mega|big|major|great)\s+(?:\w+\s+)?sale\b/i,
  /\brival black friday\b/i,
  /\bblack friday (?:sale|deals?)\b/i,
  /\bprime day\b/i,
  /\bcyber monday\b/i,
  /\b\d+\s*% off\b/i,
  /\b\d+\s*(?:x|times)\s+rewards\b/i,
  /\brewards points\b/i,
  /\bcash ?back\b/i,
  /\bdiscount code\b/i,
  /\bcoupon\b/i,
  /\bclearance\b/i,
  /\bprice drop\b/i,
  /\blowest price\b/i,
  /\bdeals?\s+on\b/i,
  /\bshop (?:now|today|the sale|the deal)\b/i,
  /\bbuy (?:now|today|one get one)\b/i,
  /\b(?:free|fast|next[ -]?day)\s+shipping\b/i,
  /\bbogo\b/i,
  /\bflash ?sale\b/i,
  /\blead(?:ing)?\s+(?:the\s+)?(?:weekly|monday|daily)\s+deals\b/i,
  /\bup to \$\d+\s+off\b/i,
  /\bfrom \$\d+(?:\.\d{2})?\b/i,
  /\bsave (?:up to )?\d+\s*%?\b/i,
  /\breduced to \$\d+\b/i,
  /\bsign up(?: now)? for\b/i
];

// Returns true when a sentence is gratuitous ad/promo copy that must not
// appear on a post. Works on individual sentences AND whole passages.
export function isRetailPromo(text) {
  return PROMO_PHRASES.some((re) => re.test(String(text || "")));
}

// Filter a passage down to unbiased sentences. Long passages are split on
// sentence boundaries; each surviving sentence must be clean.
export function filterUnbiased(text) {
  const t = String(text || "");
  return t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s && s.length >= 28 && !isRetailPromo(s))
    .join(" ");
}

export function isClean(text) {
  return !isRetailPromo(text);
}

// Kept for callers that still want the old all-store block behaviour.
export const isRetailPromoStrict = (text) => isRetailPromo(text);

export default { isRetailPromo, filterUnbiased, isClean, isRetailPromoStrict };