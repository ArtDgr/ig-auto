// Shared topic-matched photo map — FREE Unsplash images (no API key), every URL
// HTTP-verified 2026-10-15. Used by BOTH render paths:
//   - src/ig-render.js  (IG carousels — photographic page backgrounds)
//   - src/photo.js      (IG reels / TikTok — Ken Burns photo clips)
// Guarantee: photoForDeck() ALWAYS returns a photographic URL tied to the
// topic when any regex matches, else a niche-level photo, else the brand desk
// shot. Generic gradients are reserved for offline/unreachable failures only.

const U = (id) => `https://images.unsplash.com/${id}?w=1080&h=1350&fit=crop&q=80&auto=format`;

// Order matters: most specific first.
export const TOPIC_PHOTOS = [
  // Security / red-flag
  { re: /(breach|hack|ransomware|malware|phishing|vulnerab|zero.?day|exploit|password|2fa|passkey|mfa|patch tuesday|attack|steal|scam|spyware|credential|dark web|leak)/i, url: U("photo-1526374965328-7f61d4dc18c5") },
  { re: /(antivirus|firewall|vpn|encrypt|cyber)/i, url: U("photo-1550751827-4bd374c3f58b") },
  { re: /(lock|privacy|gdpr|tracking)/i, url: U("photo-1550565118-3a14e8d0386f") },
  // Wifi / networking
  { re: /(wifi|wi.fi|router|signal|mesh|5g|4g|bluetooth|hotspot|network)/i, url: U("photo-1573080496219-bb080dd4f877") },
  { re: /(ethernet|cable|modem|lan|ssh|dns|ip address)/i, url: U("photo-1558618666-fcd25c85cd64") },
  // Power / battery
  { re: /(battery|charging|charge|usb.c|power|mah|fast.charge|adapter|charger|magsafe|wireless charge)/i, url: U("photo-1616587226960-4a03badbe8bf") },
  { re: /(cpu|gpu|chip|processor|ryzen|intel|amd|nvidia|rtx|arc dlss|silicon|semiconductor|fab|nanometer|clock speed|overclock)/i, url: U("photo-1591799264318-7e6ef8ddb7ea") },
  { re: /(ssd|ram|memory|storage|benchmark|core)/i, url: U("photo-1555617981-dac3880eac6e") },
  { re: /(circuit|motherboard|board|microcontroller|arduino|raspberry)/i, url: U("photo-1518770660439-4636190af475") },
  // PCs / builds
  { re: /(gaming pc|desktop pc|rgb|build|water.?cool|case mod)/i, url: U("photo-1587202372775-e229f172b9d7") },
  { re: /(workstation|pc tower|custom pc|install ram|upgrade)/i, url: U("photo-1591488320449-011701bb6704") },
  // Apple
  { re: /(iphone|ipad|mac|macos|ios|app\.?store|siri|macbook|airpods|apple|m4|m3|vision.?pro)/i, url: U("photo-1556656793-08538906a9f8") },
  // Android / mobile
  { re: /(android|samsung|galaxy|pixel|redmi|honor|oneplus|xiaomi|fold|smartphone|5g phone)/i, url: U("photo-1610945415295-d9bbf067e59c") },
  { re: /(watch|wearable|smartwatch|airtag|tracker)/i, url: U("photo-1522125670776-3c7abb882bc2") },
  { re: /(headphone|earbud|anc|speaker|sound|audio|music)/i, url: U("photo-1505740420928-5e560c06d30e") },
  // Cameras
  { re: /(camera|photo|lens|sensor|image|megapixel|drone|gopro|dji)/i, url: U("photo-1516035069371-29a1b244cc32") },
  // Cloud / servers
  { re: /(cloud|server|data.?center|kubernetes|docker|container|aws|azure|gcp|google cloud|storage|infra|uptime|devops|sre|backup|hosting|domain)/i, url: U("photo-1558494949-ef010cbdcc31") },
  { re: /(linux|terminal|cli|shell|command|bash|ubuntu)/i, url: U("photo-1587831990711-23ca6441447b") },
  { re: /(monitor|display|4k|oled|hdr|screen|dual.?screen)/i, url: U("photo-1615840287214-7ff58936c4cf") },
  { re: /(printer|scan| paperless|toner)/i, url: U("photo-1531297484001-80022131f5a1") },
  { re: /(volunteering|volunteer|hardware\.zone|newsletter|roundup)/i, url: U("photo-1531297484001-80022131f5a1") },
  { re: /(vr|headset|meta quest|spatial)/i, url: U("photo-1535223289827-42f1e9919769") },
  // Microsoft / windows / office
  { re: /(windows|microsoft|office|365|outlook|teams|excel|word |copilot for|sharepoint|powershell|update|blue.?screen|bsod|driver)/i, url: U("photo-1593642532400-2682810df593") },
  { re: /(chrome|browser|bookmark|chromebook|chromeos|extension|password manager)/i, url: U("photo-1517077304055-6e89abbf09b0") },
  // AI
  { re: /(\bai\b|gpt|llm|model|agent|neural|openai|anthropic|claude|gemini|copilot|intelligence|machine.?learning|chatbot|bot|prompt)/i, url: U("photo-1677442136019-21780ecad995") },
  { re: /(robot|automation|autonomous|humanoid)/i, url: U("photo-1485827404703-89b55fcc595e") },
  // Guides / how-to / support
  { re: /(fix|troubleshoot|how.?to|guide|tip|tutorial|setup|cleanup|reset|checklist|slow|error|problem|backup|restore)/i, url: U("photo-1581091226825-a6a2a5aee158") },
  { re: /(repair|solder|screwdriver|diy|disassemble|fan cleaning|thermal paste)/i, url: U("photo-1588872657578-7efd1f1555ed") },
  { re: /(office|work|remote|hybrid|productivity|meeting|small business|startup)/i, url: U("photo-1497366216548-37526070297c") },
  { re: /(helpdesk|call|customer service|ticket|outsource|mssp)/i, url: U("photo-1531482615713-2afd69097998") },
  { re: /(education|student|class|school|learn|course|cheat.?sheet|saving money|deal|discount|free)/i, url: U("photo-1504384308090-c894fdcc538d") },
  { re: /(engineer|lab|prototype|research|quantum|breakthrough)/i, url: U("photo-1581092160562-40aa08e78837") },
  // Laptops
  { re: /(laptop|notebook|ultrabook|chromebook|arm laptop|snapdragon x)/i, url: U("photo-1593642632823-8f785ba67e45") },
];

// Per-niche floor photos: a niche hit always wins over the gradient.
export const NICHE_PHOTOS = {
  ai: U("photo-1677442136019-21780ecad995"),
  gadgets: U("photo-1511707171634-5f897ff02aa9"),
  apple: U("photo-1556656793-08538906a9f8"),
  hardware: U("photo-1518770660439-4636190af475"),
  security: U("photo-1526374965328-7f61d4dc18c5"),
  "it-support": U("photo-1581091226825-a6a2a5aee158"),
  "cloud-devops": U("photo-1558494949-ef010cbdcc31"),
};

// The desk shot covers anything a URL-less feed would fall to.
export const DEFAULT_PHOTO = U("photo-1498050108023-c5249f4df085");

// Match text (title + subtitle + body) against the map, then the niche floor.
export function photoUrlFor(titleText, niche) {
  const t = String(titleText || "");
  const topic = TOPIC_PHOTOS.find((p) => p.re.test(t));
  if (topic) return topic.url;
  const n = (niche || "").toLowerCase();
  if (NICHE_PHOTOS[n]) return NICHE_PHOTOS[n];
  if (n.includes("cloud")) return NICHE_PHOTOS["cloud-devops"];
  if (n.includes("support")) return NICHE_PHOTOS["it-support"];
  return DEFAULT_PHOTO;
}

export default { TOPIC_PHOTOS, NICHE_PHOTOS, DEFAULT_PHOTO, photoUrlFor };
