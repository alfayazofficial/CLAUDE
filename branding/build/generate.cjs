/* Paperwright brand asset generator.
 * Usage: node branding/build/generate.cjs        -> writes SVG + tokens
 *        node branding/build/generate.cjs --png  -> also renders PNG via Playwright
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// ---------- Brand tokens ----------
const C = {
  ink: '#0F1B33',        // Ink Navy        - primary, backgrounds, headlines
  navy2: '#1A2B4D',      // Deep Margin     - cards on dark
  indigo: '#3A4FE0',     // Citation Indigo - links, buttons, key accents
  sky: '#DCE3FF',        // Footnote Sky    - tints, fold corner, soft fills
  amber: '#F6A82C',      // Highlighter     - the signature accent (use sparingly)
  amberDeep: '#8F5400',  // Amber Text      - amber used as text on light bg (AA)
  parchment: '#F7F4EC',  // Parchment       - warm paper background
  paper: '#FFFFFF',      // Paper           - white
  slate: '#5B6477',      // Slate           - secondary text
  mist: '#E6E9F0',       // Mist            - borders, dividers, rules
  sage: '#17795A',       // Verified Sage   - success / approved
  red: '#C23636',        // Reviewer Red    - errors / corrections
};
const NAMES = {
  ink: 'Ink Navy', navy2: 'Deep Margin', indigo: 'Citation Indigo', sky: 'Footnote Sky',
  amber: 'Highlighter Amber', amberDeep: 'Amber Text', parchment: 'Parchment', paper: 'Paper White',
  slate: 'Slate', mist: 'Mist', sage: 'Verified Sage', red: 'Reviewer Red',
};
const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";
const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";
const BRAND = 'Paperwright';
const HANDLE = '@paperwright';
const TAGLINE = 'Research, written right.';

// ---------- helpers ----------
const w = (rel, data) => {
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
  return f;
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const svg = (W, H, inner, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  `<defs>${defs}<pattern id="dots" width="44" height="44" patternUnits="userSpaceOnUse">` +
  `<circle cx="3" cy="3" r="1.6" fill="${C.sky}" opacity="0.13"/></pattern></defs>${inner}</svg>`;
const rect = (x, y, W, H, fill, o = {}) =>
  `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="${fill}"` +
  (o.rx ? ` rx="${o.rx}"` : '') + (o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 2}"` : '') +
  (o.op ? ` opacity="${o.op}"` : '') + (o.tr ? ` transform="${o.tr}"` : '') + '/>';
const t = (x, y, str, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.font || SANS}" font-size="${o.size || 32}" ` +
  `font-weight="${o.weight || 400}" fill="${o.fill || C.ink}" text-anchor="${o.anchor || 'start'}"` +
  (o.ls ? ` letter-spacing="${o.ls}"` : '') + (o.op ? ` opacity="${o.op}"` : '') + `>${str}</text>`;
const pill = (x, y, label, size, o = {}) => {
  const W = label.length * size * 0.58 + size * 1.8, H = size * 2;
  return rect(x, y, W, H, o.fill || 'none', { rx: H / 2, stroke: o.stroke, sw: 2 }) +
    t(x + W / 2, y + H / 2 + size * 0.34, esc(label), { size, fill: o.text || C.parchment, anchor: 'middle', weight: 600 }) ;
};
const pillW = (label, size) => label.length * size * 0.58 + size * 1.8;

// ---------- logo mark (120 x 120 grid) ----------
function glyph(page = C.paper, fold = C.sky, line = C.mist, hi = C.amber) {
  return `<path d="M33 22 H70 L89 41 V98 H33 Z" fill="${page}"/>` +
    `<path d="M70 22 V41 H89 Z" fill="${fold}"/>` +
    rect(42, 52, 28, 5, line, { rx: 2.5 }) + rect(42, 62, 38, 5, line, { rx: 2.5 }) +
    rect(40, 74, 42, 11, hi, { rx: 5.5 }) + rect(42, 77, 30, 5, C.ink, { rx: 2.5, op: 0.9 });
}
function mark(x, y, s, theme = 'light') {
  const bg = { light: C.ink, dark: C.indigo, amber: C.ink }[theme];
  return `<g transform="translate(${x} ${y}) scale(${s / 120})">` +
    rect(0, 0, 120, 120, bg, { rx: 28 }) + glyph() + `</g>`;
}
function monoMark(x, y, s, color) {
  return `<g transform="translate(${x} ${y}) scale(${s / 120})" fill="${color}">` +
    `<path fill-rule="evenodd" d="M0 28 A28 28 0 0 1 28 0 H92 A28 28 0 0 1 120 28 V92 A28 28 0 0 1 92 120 H28 A28 28 0 0 1 0 92 Z ` +
    `M33 22 H70 L89 41 V98 H33 Z"/>` +
    `<rect x="40" y="74" width="42" height="11" rx="5.5" fill="${color}"/></g>`;
}
function wordmark(x, y, size, base, accent) {
  return `<text x="${x}" y="${y}" font-family="${SERIF}" font-size="${size}" font-weight="700" fill="${base}" letter-spacing="${-size * 0.01}">Paper<tspan fill="${accent}">wright</tspan></text>`;
}
function lockup(x, y, s, theme) {
  const dark = theme === 'dark';
  return mark(x, y, s, dark ? 'dark' : 'light') +
    wordmark(x + s * 1.28, y + s * 0.7, s * 0.56, dark ? C.parchment : C.ink, dark ? C.amber : C.indigo);
}

// ---------- logos ----------
function buildLogos() {
  w('logo/paperwright-mark.svg', svg(120, 120, mark(0, 0, 120)));
  w('logo/paperwright-favicon.svg', svg(64, 64, mark(0, 0, 64)));
  w('logo/paperwright-horizontal-light.svg',
    svg(560, 140, rect(0, 0, 560, 140, C.parchment) + lockup(20, 10, 120, 'light') +
      t(172, 128, TAGLINE.toUpperCase(), { size: 13, fill: C.slate, weight: 600, ls: 3 })));
  w('logo/paperwright-horizontal-dark.svg',
    svg(560, 140, rect(0, 0, 560, 140, C.ink) + lockup(20, 10, 120, 'dark') +
      t(172, 128, TAGLINE.toUpperCase(), { size: 13, fill: C.sky, weight: 600, ls: 3 })));
  w('logo/paperwright-stacked-light.svg',
    svg(360, 330, rect(0, 0, 360, 330, C.parchment) + mark(120, 20, 120, 'light') +
      `<text x="180" y="222" text-anchor="middle" font-family="${SERIF}" font-size="56" font-weight="700" fill="${C.ink}">Paper<tspan fill="${C.indigo}">wright</tspan></text>` +
      t(180, 262, TAGLINE.toUpperCase(), { size: 14, fill: C.slate, weight: 600, ls: 3, anchor: 'middle' })));
  w('logo/paperwright-mono-black.svg', svg(120, 120, monoMark(0, 0, 120, '#000000')));
  w('logo/paperwright-mono-white.svg', svg(120, 120, rect(0, 0, 120, 120, '#000000') + monoMark(0, 0, 120, '#FFFFFF')));
  // avatar: glyph only on full-bleed ink so platform circle-crop stays clean
  w('logo/paperwright-avatar.svg', svg(1000, 1000, rect(0, 0, 1000, 1000, C.ink) +
    `<g transform="translate(180 180) scale(${640 / 120})">${glyph()}</g>`));
}

// ---------- platform profile logos ----------
// Glyph sits inside the central 86% of the canvas (glyph itself is ~55% of that) so Facebook/Instagram circle crops never clip it.
function profile(S) {
  const g = S * 0.86;
  return svg(S, S, rect(0, 0, S, S, C.ink) +
    `<g transform="translate(${(S - g) / 2} ${(S - g) / 2}) scale(${g / 120})">${glyph()}</g>`);
}
function buildProfiles() {
  w('social/profile/facebook-profile-720x720.svg', profile(720));
  w('social/profile/instagram-profile-1080x1080.svg', profile(1080));
  w('social/profile/linkedin-logo-400x400.svg', profile(400));
  // preview: how each platform crops it
  const P = 300, pad = 40, W = pad * 4 + P * 3, H = P + pad * 2 + 70;
  const cell = (i, label, round) => {
    const x = pad + i * (P + pad), r = round ? P / 2 : 28;
    return `<clipPath id="c${i}"><rect x="${x}" y="${pad}" width="${P}" height="${P}" rx="${r}"/></clipPath>` +
      `<g clip-path="url(#c${i})"><g transform="translate(${x} ${pad}) scale(${P / 400})">${profile(400).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></g>` +
      t(x + P / 2, pad + P + 44, label, { size: 22, weight: 700, fill: C.ink, anchor: 'middle' });
  };
  w('social/profile/profile-crop-preview.svg', svg(W, H, rect(0, 0, W, H, C.parchment) +
    cell(0, 'Facebook (circle)', true) + cell(1, 'Instagram (circle)', true) + cell(2, 'LinkedIn (square)', false)));
}

// ---------- decorative front page ----------
function pageArt(cx, cy, s) {
  const u = s / 100;
  const front = `<g transform="rotate(-3)">` +
    rect(-32 * u, -42 * u, 64 * u, 84 * u, C.paper, { rx: 3 * u }) +
    rect(-24 * u, -32 * u, 30 * u, 4 * u, C.ink, { rx: 2 * u }) +
    [-20, -13, -6].map(y => rect(-24 * u, y * u, 48 * u, 2.6 * u, C.mist, { rx: 1.3 * u })).join('') +
    rect(-26 * u, 2 * u, 52 * u, 8 * u, C.amber, { rx: 4 * u, op: 0.95 }) +
    rect(-24 * u, 4.2 * u, 40 * u, 3.6 * u, C.ink, { rx: 1.8 * u }) +
    [14, 21, 28].map(y => rect(-24 * u, y * u, (y === 28 ? 28 : 48) * u, 2.6 * u, C.mist, { rx: 1.3 * u })).join('') +
    t(20 * u, 36 * u, '[12]', { size: 6.5 * u, fill: C.indigo, weight: 700, font: SANS }) + `</g>`;
  return `<g transform="translate(${cx} ${cy})">` +
    `<g transform="rotate(-12)">${rect(-32 * u, -42 * u, 64 * u, 84 * u, C.navy2, { rx: 3 * u, stroke: C.indigo, sw: 2 })}</g>` +
    `<g transform="rotate(8)">${rect(-32 * u, -42 * u, 64 * u, 84 * u, C.indigo, { rx: 3 * u, op: 0.55 })}</g>` +
    front + `</g>`;
}

// ---------- banners ----------
function bannerContent(cw, ch) {
  const lh = ch * 0.2;
  let o = t(0, ch * 0.2, BRAND.toUpperCase() + '  ·  RESEARCH STUDIO', { size: ch * 0.058, fill: C.amber, weight: 700, ls: ch * 0.012 });
  o += t(0, ch * 0.46, 'Research,', { size: lh, font: SERIF, weight: 700, fill: C.parchment });
  o += t(0, ch * 0.46 + lh * 1.02, `written <tspan fill="${C.amber}">right.</tspan>`, { size: lh, font: SERIF, weight: 700, fill: C.parchment });
  const chips = ['Research Papers', 'Technical Papers', 'Journals', 'Assignments'];
  const cs = ch * 0.05;
  let x = 0;
  const y = ch * 0.84;
  chips.forEach(c => { o += pill(x, y - cs * 1.4, c, cs, { stroke: C.sky, text: C.sky }); x += pillW(c, cs) + cs * 0.8; });
  o += pageArt(cw * 0.84, ch * 0.5, ch * 0.82);
  return o;
}
function banner(W, H, x0, y0, cw, ch) {
  return svg(W, H, rect(0, 0, W, H, C.ink) + rect(0, 0, W, H, 'url(#dots)') +
    rect(0, H - 8, W, 8, C.amber) + `<g transform="translate(${x0} ${y0})">${bannerContent(cw, ch)}</g>`);
}
function buildBanners() {
  w('social/banners/linkedin-banner-1584x396.svg', banner(1584, 396, 330, 30, 1180, 330));
  w('social/banners/x-header-1500x500.svg', banner(1500, 500, 300, 50, 1120, 380));
  w('social/banners/facebook-cover-1640x624.svg', banner(1640, 624, 320, 90, 1240, 440));
  // YouTube: keep all content in the 1546x423 safe zone, centred
  w('social/banners/youtube-banner-2560x1440.svg', banner(2560, 1440, (2560 - 1546) / 2, (1440 - 423) / 2, 1546, 423));
}

// ---------- posts ----------
function footer(W, H, theme) {
  const dark = theme === 'dark';
  return rect(80, H - 112, W - 160, 2, dark ? C.sky : C.mist, { op: dark ? 0.25 : 1 }) +
    t(80, H - 56, HANDLE, { size: 28, weight: 600, fill: dark ? C.sky : C.slate }) +
    t(W - 80, H - 56, TAGLINE, { size: 28, font: SERIF, fill: dark ? C.amber : C.indigo, anchor: 'end', weight: 600 });
}
const bg = (W, H, fill, dots) => rect(0, 0, W, H, fill) + (dots ? rect(0, 0, W, H, 'url(#dots)') : '');

const posts = {
  '01-launch': () => {
    const W = 1080, H = 1080;
    return svg(W, H, bg(W, H, C.ink, true) + lockup(80, 76, 72, 'dark') +
      `<g opacity="0.95">${pageArt(850, 330, 420)}</g>` +
      t(80, 640, 'Your research', { size: 92, font: SERIF, weight: 700, fill: C.parchment }) +
      t(80, 740, 'deserves a', { size: 92, font: SERIF, weight: 700, fill: C.parchment }) +
      t(80, 840, 'better finish.', { size: 92, font: SERIF, weight: 700, fill: C.amber }) +
      t(80, 910, 'Papers · Journals · Technical reports · Assignments', { size: 30, fill: C.sky }) +
      rect(80, 940, 400, 6, C.amber, { rx: 3 }) + footer(W, H, 'dark'));
  },
  '02-services': () => {
    const W = 1080, H = 1080;
    const items = [
      ['01', 'Research Papers', 'Structure, argument, polish', C.indigo],
      ['02', 'Technical Papers', 'Methods, specs, clarity', C.ink],
      ['03', 'Journal Submissions', 'Format, cover letter, replies', C.amber],
      ['04', 'Literature Reviews', 'Map the field, fast', C.sage],
      ['05', 'Data & Statistics', 'Analysis you can defend', C.indigo],
      ['06', 'Assignment Coaching', 'Feedback that teaches', C.ink],
    ];
    let o = bg(W, H, C.parchment) + lockup(80, 60, 56, 'light') + t(80, 220, 'What we do', { size: 72, font: SERIF, weight: 700 });
    items.forEach(([n, a, b, col], i) => {
      const x = 80 + (i % 2) * 480, y = 270 + Math.floor(i / 2) * 210;
      o += rect(x, y, 440, 186, C.paper, { rx: 20, stroke: C.mist }) + rect(x, y + 24, 8, 138, col, { rx: 4 }) +
        t(x + 36, y + 52, n, { size: 22, weight: 700, fill: C.amberDeep, ls: 2 }) +
        t(x + 36, y + 102, a, { size: 33, font: SERIF, weight: 700 }) +
        t(x + 36, y + 142, b, { size: 22, fill: C.slate });
    });
    return svg(W, H, o + footer(W, H));
  },
  '03-writing-tip': () => {
    const W = 1080, H = 1080;
    const lines = ['State your research', 'question in one', 'sentence. If you', 'can’t, reviewers', 'can’t either.'];
    let o = bg(W, H, C.indigo) + rect(0, 0, W, H, 'url(#dots)') + t(80, 130, 'WRITING TIP #01', { size: 28, weight: 700, fill: C.amber, ls: 5 }) +
      t(70, 400, '“', { size: 260, font: SERIF, weight: 700, fill: C.amber, op: 0.9 });
    lines.forEach((l, i) => { o += t(80, 540 + i * 88, l, { size: 78, font: SERIF, weight: 700, fill: i === 4 ? C.amber : C.paper }); });
    return svg(W, H, o + footer(W, H, 'dark'));
  },
  '04-process': () => {
    const W = 1080, H = 1080;
    const steps = [['Brief', 'Share your goal, target journal and deadline'], ['Review', 'Line-by-line feedback on argument and method'],
      ['Revise', 'You stay the author. We coach, edit and format'], ['Submit', 'Final checklist, cover letter and proof-read']];
    let o = bg(W, H, C.parchment) + lockup(80, 60, 56, 'light') +
      t(80, 210, 'From draft to', { size: 64, font: SERIF, weight: 700 }) + t(80, 280, 'submit-ready.', { size: 64, font: SERIF, weight: 700, fill: C.indigo }) +
      rect(116, 390, 4, 470, C.mist, { rx: 2 });
    steps.forEach(([a, b], i) => {
      const y = 380 + i * 160;
      o += `<circle cx="118" cy="${y + 28}" r="38" fill="${i === 3 ? C.amber : C.ink}"/>` +
        t(118, y + 42, String(i + 1), { size: 38, font: SERIF, weight: 700, fill: i === 3 ? C.ink : C.paper, anchor: 'middle' }) +
        t(190, y + 24, a, { size: 40, font: SERIF, weight: 700 }) + t(190, y + 68, b, { size: 26, fill: C.slate });
    });
    return svg(W, H, o + footer(W, H));
  },
  '05-checklist': () => {
    const W = 1080, H = 1080;
    const items = ['Abstract within the word limit', 'References match journal style', 'Figures at 300 DPI, captions complete', 'Ethics and data statements included', 'Cover letter states the contribution'];
    let o = bg(W, H, C.ink, true) + lockup(80, 60, 56, 'dark') + t(80, 230, 'Before you', { size: 76, font: SERIF, weight: 700, fill: C.parchment }) +
      t(80, 320, 'submit.', { size: 76, font: SERIF, weight: 700, fill: C.amber });
    items.forEach((s, i) => {
      const y = 410 + i * 110;
      o += rect(80, y, 64, 64, 'none', { rx: 14, stroke: C.amber, sw: 4 }) +
        `<path d="M98 ${y + 33} l12 12 l22 -26" fill="none" stroke="${C.amber}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
        t(176, y + 44, esc(s), { size: 36, fill: C.parchment });
    });
    return svg(W, H, o + footer(W, H, 'dark'));
  },
  '06-cta': () => {
    const W = 1080, H = 1080;
    return svg(W, H, bg(W, H, C.amber) + lockup(80, 76, 72, 'light') +
      t(80, 440, 'Free 20-minute', { size: 100, font: SERIF, weight: 700, fill: C.ink }) +
      t(80, 550, 'manuscript check.', { size: 100, font: SERIF, weight: 700, fill: C.ink }) +
      rect(80, 585, 260, 8, C.ink, { rx: 4 }) +
      t(80, 680, 'Send your abstract. We tell you what a', { size: 34, fill: C.ink }) +
      t(80, 726, 'reviewer would flag first.', { size: 34, fill: C.ink }) +
      rect(80, 800, 470, 100, C.ink, { rx: 50 }) + t(315, 864, 'Message us: PAPER', { size: 38, weight: 700, fill: C.parchment, anchor: 'middle' }) +
      rect(80, H - 112, W - 160, 2, C.ink, { op: 0.25 }) + t(80, H - 56, HANDLE, { size: 28, weight: 600, fill: C.ink }) +
      t(W - 80, H - 56, TAGLINE, { size: 28, font: SERIF, fill: C.ink, anchor: 'end', weight: 600 }));
  },
};

function buildPosts() {
  Object.entries(posts).forEach(([k, fn]) => w(`social/posts/instagram-${k}-1080x1080.svg`, fn()));

  // Story 1080x1920 (keep key content out of top/bottom 250px)
  {
    const W = 1080, H = 1920;
    const items = ['Unclear contribution', 'Weak methodology section', 'Wrong journal fit', 'Ignored author guidelines'];
    let o = bg(W, H, C.ink, true) + lockup(80, 100, 72, 'dark') + t(80, 480, '4 reasons papers', { size: 92, font: SERIF, weight: 700, fill: C.parchment }) +
      t(80, 585, 'get desk-rejected.', { size: 92, font: SERIF, weight: 700, fill: C.amber });
    items.forEach((s, i) => {
      const y = 720 + i * 180;
      o += rect(80, y, W - 160, 140, C.navy2, { rx: 24, stroke: C.indigo, sw: 2 }) +
        t(130, y + 90, '0' + (i + 1), { size: 44, font: SERIF, weight: 700, fill: C.amber }) + t(240, y + 88, s, { size: 40, fill: C.parchment, weight: 600 });
    });
    o += t(80, 1560, 'Don’t be number five.', { size: 52, font: SERIF, weight: 700, fill: C.parchment }) +
      rect(80, 1610, 560, 100, C.amber, { rx: 50 }) + t(360, 1674, 'Free manuscript check', { size: 34, weight: 700, fill: C.ink, anchor: 'middle' });
    w('social/posts/instagram-story-1080x1920.svg', svg(W, H, o));
  }

  // LinkedIn post 1200x627
  {
    const W = 1200, H = 627;
    w('social/posts/linkedin-post-1200x627.svg', svg(W, H, bg(W, H, C.parchment) + rect(700, 0, 500, H, C.ink) + rect(700, 0, 500, H, 'url(#dots)') +
      lockup(60, 56, 56, 'light') + t(60, 270, 'Peer review is', { size: 64, font: SERIF, weight: 700 }) +
      t(60, 346, 'a conversation.', { size: 64, font: SERIF, weight: 700 }) +
      t(60, 440, `We help you <tspan fill="${C.indigo}" font-weight="700">prepare for it.</tspan>`, { size: 34, fill: C.slate }) +
      rect(60, 480, 200, 6, C.amber, { rx: 3 }) + t(60, 560, HANDLE + '  ·  ' + TAGLINE, { size: 22, fill: C.slate, weight: 600 }) +
      pageArt(950, H / 2, 470)));
  }
}

// ---------- palette sheet + tokens ----------
const hex2rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (h) => { const [r, g, b] = hex2rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function hsl(h) {
  let [r, g, b] = hex2rgb(h).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let H = 0, S = 0;
  if (d) {
    S = d / (1 - Math.abs(2 * l - 1));
    H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    H = (H * 60 + 360) % 360;
  }
  return `${Math.round(H)}, ${Math.round(S * 100)}%, ${Math.round(l * 100)}%`;
}
function cmyk(h) {
  const [r, g, b] = hex2rgb(h).map(v => v / 255), k = 1 - Math.max(r, g, b);
  if (k === 1) return '0, 0, 0, 100';
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map(v => Math.round(v * 100)).join(', ');
}
function buildTokens() {
  w('tokens/colors.json', JSON.stringify({ brand: BRAND, tagline: TAGLINE, colors: Object.fromEntries(Object.entries(C).map(([k, v]) => [k, { name: NAMES[k], hex: v, rgb: hex2rgb(v).join(', '), hsl: hsl(v), cmykApprox: cmyk(v) }])) }, null, 2) + '\n');
  w('tokens/colors.css', `/* ${BRAND} brand tokens */\n:root {\n${Object.entries(C).map(([k, v]) => `  --pw-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}; /* ${NAMES[k]} */`).join('\n')}\n\n  --pw-font-display: ${SERIF};\n  --pw-font-body: ${SANS};\n  --pw-radius: 20px;\n}\n`);
  w('tokens/tailwind.colors.js', `// Tailwind: theme.extend.colors = require('./tailwind.colors.js')\nmodule.exports = {\n${Object.entries(C).map(([k, v]) => `  ${k}: '${v}', // ${NAMES[k]}`).join('\n')}\n};\n`);
  const rows = Object.keys(C).map(k => `| ${NAMES[k]} | \`${C[k]}\` | ${hex2rgb(C[k]).join(', ')} | ${hsl(C[k])} | ${cmyk(C[k])} |`);
  const pairs = [['paper', 'ink'], ['parchment', 'ink'], ['ink', 'parchment'], ['ink', 'amber'], ['ink', 'sky'], ['paper', 'indigo'], ['indigo', 'paper'], ['amber', 'ink'], ['parchment', 'amberDeep'], ['parchment', 'slate'], ['paper', 'sage'], ['paper', 'red'], ['parchment', 'amber']];
  const prow = pairs.map(([b, f]) => { const r = contrast(C[b], C[f]); return `| ${NAMES[f]} on ${NAMES[b]} | ${r.toFixed(2)}:1 | ${r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'Large text / graphics only' : 'Fail - do not use'} |`; });
  w('tokens/COLORS.md', `# Paperwright colour reference\n\nGenerated by \`build/generate.cjs\`. Do not edit by hand.\n\n| Name | HEX | RGB | HSL | CMYK (approx.) |\n|---|---|---|---|---|\n${rows.join('\n')}\n\nCMYK values are a naive conversion. Proof on the actual printer/stock before any print run.\n\n## Contrast (WCAG 2.1)\n\n| Pair | Ratio | Result |\n|---|---|---|\n${prow.join('\n')}\n`);

  // Palette sheet
  const W = 1600, H = 900;
  let o = rect(0, 0, W, H, C.parchment) + lockup(60, 40, 64, 'light') + t(W - 60, 90, 'COLOUR PALETTE', { size: 22, weight: 700, fill: C.slate, ls: 5, anchor: 'end' });
  const groups = [['PRIMARY', ['ink', 'indigo', 'amber']], ['NEUTRALS', ['parchment', 'paper', 'sky', 'mist', 'slate', 'navy2']], ['SIGNALS', ['sage', 'red', 'amberDeep']]];
  let y = 170;
  groups.forEach(([g, keys]) => {
    o += t(60, y, g, { size: 18, weight: 700, fill: C.slate, ls: 4 });
    const sw = keys.length <= 3 ? 280 : 200;
    keys.forEach((k, i) => {
      const x = 60 + i * (sw + 24), dk = lum(C[k]) < 0.35;
      o += rect(x, y + 20, sw, 180, C[k], { rx: 18, stroke: C.mist }) +
        t(x + 20, y + 150, NAMES[k], { size: 22, weight: 700, fill: dk ? C.parchment : C.ink }) +
        t(x + 20, y + 180, C[k] + '  ·  ' + hex2rgb(C[k]).join(' '), { size: 17, fill: dk ? C.sky : C.slate });
    });
    y += 250;
  });
  w('logo/paperwright-palette.svg', svg(W, H, o));
}

// ---------- brand board (HTML) ----------
function buildBoard() {
  const img = (src, cls = '') => `<img class="${cls}" src="${src}" alt="${path.basename(src)}">`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Paperwright Brand Board</title><link rel="stylesheet" href="tokens/colors.css">
<style>body{margin:0;background:var(--pw-parchment);color:var(--pw-ink);font-family:${SANS}}
main{max-width:1200px;margin:0 auto;padding:32px 20px 80px}h1,h2{font-family:${SERIF}}h2{margin:48px 0 16px;border-bottom:3px solid var(--pw-amber);display:inline-block;padding-bottom:4px}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}img{width:100%;height:auto;border-radius:12px;border:1px solid var(--pw-mist);background:#fff}
.wide{display:block;margin-bottom:16px}small{color:var(--pw-slate)}</style></head><body><main>
<h1>Paperwright - Brand Board</h1><small>${TAGLINE} Open each file in /logo, /social, /tokens.</small>
<h2>Logo</h2><div class="grid">${['paperwright-horizontal-light', 'paperwright-horizontal-dark', 'paperwright-stacked-light', 'paperwright-mark', 'paperwright-mono-black', 'paperwright-mono-white'].map(n => img(`logo/${n}.svg`)).join('')}</div>
<h2>Palette</h2>${img('logo/paperwright-palette.svg', 'wide')}
<h2>Banners</h2>${['linkedin-banner-1584x396', 'x-header-1500x500', 'facebook-cover-1640x624', 'youtube-banner-2560x1440'].map(n => img(`social/banners/${n}.svg`, 'wide')).join('')}
<h2>Posts</h2><div class="grid">${Object.keys(posts).map(k => img(`social/posts/instagram-${k}-1080x1080.svg`)).join('')}${img('social/posts/linkedin-post-1200x627.svg')}${img('social/posts/instagram-story-1080x1920.svg')}</div>
</main></body></html>`;
  w('brand-board.html', html);
}

// ---------- PNG export ----------
async function renderPng() {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const files = [];
  (function walk(d) { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); e.isDirectory() ? (e.name !== 'build' && walk(p)) : p.endsWith('.svg') && files.push(p); }); })(ROOT);
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    const [, W, H] = s.match(/width="(\d+)" height="(\d+)"/);
    const pg = await b.newPage({ viewport: { width: +W, height: +H } });
    await pg.setContent(`<html><body style="margin:0">${s}</body></html>`);
    await pg.screenshot({ path: f.replace(/\.svg$/, '.png') });
    await pg.close();
  }
  await b.close();
  console.log(`PNG: rendered ${files.length} files`);
}

buildLogos(); buildProfiles(); buildBanners(); buildPosts(); buildTokens(); buildBoard();
console.log('SVG + tokens written to', ROOT);
if (process.argv.includes('--png')) renderPng().catch(e => { console.error(e); process.exit(1); });
