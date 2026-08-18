// Retail-store & promo scrubber.
//
// Stance: 100% unbiased — posts must never read as free advertising for any
// retail store, web store, or promotional campaign. Text pulled from a source
// article (RSS snippets, deepened paragraphs) is filtered sentence-by-sentence
// so no bricks-and-mortar store, online retailer, or sale-boilerplate survives
// into slides or captions.
//
// Note: coverage of the companies *behind* the tech (Apple, Samsung, Google,
// Intel…) is news, not an ad — the device makers are the subject of the story,
// not a vendor we are promoting. The scrub targets *retailers / stores* and
// *promo/deal copy* ("X's sale is now live", "Y% off", "rewards points").

const RETAIL_STORES = [
  /\bbest buy\b/i,
  /\bwalmart\b/i,
  /\btarget(?: stores?)?\b/i,
  /\bcostco\b/i,
  /\bnewegg\b/i,
  /\bmicro ?center\b/i,
  /\bb&h(?: photo)?\b/i,
  /\bamazon(?:\.com|\.co\.uk)?\b/i,
  /\bebay\b/i,
  /\baliexpress\b/i,
  /\btemu\b/i,
  /\bshein\b/i,
  /\betisy\b/i,
  /\bshopify\b/i,
  /\bmacys\b/i,
  /\bkohls?\b/i,
  /\bnordstrom\b/i,
  /\bhome ?depot\b/i,
  /\blower?s\b/i,
  /\bcurrys\b/i,
  /\bargos\b/i,
  /\bcarphone\b/i,
  /\bharvey ?norman\b/i,
  /\bjbhifi\b/i,
  /\bthe ?good ?guys\b/i,
  /\boffice ?works\b/i,
  /\bstationery ?papers?\b/i
];

const PROMO_PHRASES = [
  /\bsale is (?:now )?live\b/i,
  /\b(?:massive|huge|big|epic|giant|mega)\s+\w* ?sale\b/i,
  /\bsale now (?:live|on)\b/i,
  /\brival black friday\b/i,
  /\bblack friday (?:sale|deals?|deals)\b/i,
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
  /\bdeals? on (?:tv|phones?|laptops?|electronics)\b/i,
  /\bshop (?:now|today)\b/i,
  /\bbuy (?:now|today|one get one)\b/i,
  /\b(?:free|fast)\s+shipping\b/i,
  /\bbogo\b/i,
  /\bflash ?sale\b/i,
  /\blead(?:ing)?\s+(?:the\s+)?(?:weekly|monday|daily)\s+deals\b/i
];

export function scrubText(input) {
  const text = String(input || "");
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => !s.length || s.length < 28)
    .map(() => "")
    .join(" ");
}

// Returns true when a sentence is retail-store or promo copy that must not
// appear on a post. Works on individual sentences AND whole passages.
export function isRetailPromo(text) {
  const t = String(text || "");
  if (RETAIL_STORES.some((re) => re.test(t))) return true;
  if (PROMO_PHRASES.some((re) => re.test(t))) return true;
  return false;
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

export default { scrubText, isRetailPromo, filterUnbiased, isClean };