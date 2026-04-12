/**
 * Site List and Experiment Sets for Bulk Capture Experiment
 *
 * Each site is tagged across 5 diversity axes so we can slice accuracy
 * data any way we want:
 *
 * 1. category    - what the site IS (news, ecommerce, spa, etc.)
 * 2. complexity  - expected DOM size / JS dependency (simple|moderate|complex)
 * 3. rendering   - how the HTML is produced (static|ssr|csr|hybrid)
 * 4. script      - primary writing system (latin|cjk|arabic|cyrillic|indic|mixed)
 * 5. a11y        - expected accessibility maturity (high|medium|low)
 *
 * Three experiment sets test different hypotheses:
 *
 * Set A: "Breadth" - 50 sites, max category diversity, 1 per niche
 *         Tests: does VG work across the full spectrum of site types?
 *
 * Set B: "Depth"   - 50 sites, focused on known-hard patterns
 *         Tests: where does VG break? SPAs, huge DOMs, shadow DOM, RTL
 *
 * Set C: "Real-world" - 50 sites, weighted by actual web traffic
 *         Tests: what accuracy would a typical user experience?
 */

/* eslint-disable max-len */

// ──────────────────────────────────────────────
// Full site pool (all 150 sites with diversity tags)
// ──────────────────────────────────────────────

const SITES = [
  // ── News / Media (15) ──
  { url: 'https://www.bbc.com', category: 'news', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.reuters.com', category: 'news', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://www.aljazeera.com', category: 'news', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.theguardian.com', category: 'news', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://apnews.com', category: 'news', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.npr.org', category: 'news', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.nature.com', category: 'news', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://arstechnica.com', category: 'news', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://news.ycombinator.com', category: 'news', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://www.dw.com/en/', category: 'news', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.theverge.com', category: 'news', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://techcrunch.com', category: 'news', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.wired.com', category: 'news', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://www.economist.com', category: 'news', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://text.npr.org', category: 'news', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'high' },

  // ── E-commerce (13) ──
  { url: 'https://www.etsy.com', category: 'ecommerce', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://www.ebay.com', category: 'ecommerce', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://www.target.com', category: 'ecommerce', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'high' },
  { url: 'https://www.bestbuy.com', category: 'ecommerce', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://www.ikea.com', category: 'ecommerce', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'high' },
  { url: 'https://www.zappos.com', category: 'ecommerce', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.newegg.com', category: 'ecommerce', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'low' },
  { url: 'https://www.wayfair.com', category: 'ecommerce', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.bookshop.org', category: 'ecommerce', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.rei.com', category: 'ecommerce', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'high' },
  { url: 'https://www.nordstrom.com', category: 'ecommerce', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.homedepot.com', category: 'ecommerce', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://www.costco.com', category: 'ecommerce', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'medium' },

  // ── SPA / Web Apps (13) ──
  { url: 'https://github.com/explore', category: 'spa', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'high' },
  { url: 'https://gitlab.com/explore', category: 'spa', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://codepen.io', category: 'spa', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://stackblitz.com', category: 'spa', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'low' },
  { url: 'https://figma.com', category: 'spa', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://notion.so', category: 'spa', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://trello.com', category: 'spa', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.canva.com', category: 'spa', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://excalidraw.com', category: 'spa', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'low' },
  { url: 'https://codesandbox.io', category: 'spa', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'low' },
  { url: 'https://vercel.com', category: 'spa', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'high' },
  { url: 'https://netlify.com', category: 'spa', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://render.com', category: 'spa', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },

  // ── Static / Blogs (13) ──
  { url: 'https://blog.rust-lang.org', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'medium' },
  { url: 'https://go.dev/blog/', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'high' },
  { url: 'https://www.joelonsoftware.com', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://danluu.com', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://www.paulgraham.com', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://motherfuckingwebsite.com', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://lite.cnn.com', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'medium' },
  { url: 'https://250kb.club', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'medium' },
  { url: 'https://100r.co', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://solar.lowtechmagazine.com', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'medium' },
  { url: 'https://www.marginalia.nu', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://drewdevault.com', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'medium' },
  { url: 'https://jvns.ca', category: 'static', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'medium' },

  // ── Government / Institutional (12) ──
  { url: 'https://www.usa.gov', category: 'government', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.gov.uk', category: 'government', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.canada.ca/en.html', category: 'government', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.australia.gov.au', category: 'government', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.nasa.gov', category: 'government', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'high' },
  { url: 'https://www.cdc.gov', category: 'government', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.nih.gov', category: 'government', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.un.org/en/', category: 'government', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.who.int', category: 'government', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.europa.eu/en', category: 'government', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.whitehouse.gov', category: 'government', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'high' },
  { url: 'https://www.loc.gov', category: 'government', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },

  // ── i18n / Non-Latin (14) ──
  { url: 'https://www.nhk.or.jp/news/', category: 'i18n', complexity: 'moderate', rendering: 'ssr', script: 'cjk', a11y: 'medium' },
  { url: 'https://www.asahi.com', category: 'i18n', complexity: 'complex', rendering: 'ssr', script: 'cjk', a11y: 'low' },
  { url: 'https://www.lemonde.fr', category: 'i18n', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.spiegel.de', category: 'i18n', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://www.corriere.it', category: 'i18n', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'low' },
  { url: 'https://www.elpais.com', category: 'i18n', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.aljazeera.net', category: 'i18n', complexity: 'complex', rendering: 'ssr', script: 'arabic', a11y: 'medium' },
  { url: 'https://arabic.cnn.com', category: 'i18n', complexity: 'complex', rendering: 'ssr', script: 'arabic', a11y: 'medium' },
  { url: 'https://www.chosun.com', category: 'i18n', complexity: 'complex', rendering: 'ssr', script: 'cjk', a11y: 'low' },
  { url: 'https://www.kompas.com', category: 'i18n', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'low' },
  { url: 'https://www.globo.com', category: 'i18n', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://www.ndtv.com', category: 'i18n', complexity: 'complex', rendering: 'ssr', script: 'indic', a11y: 'low' },
  { url: 'https://timesofindia.indiatimes.com', category: 'i18n', complexity: 'complex', rendering: 'ssr', script: 'indic', a11y: 'low' },
  { url: 'https://lenta.ru', category: 'i18n', complexity: 'moderate', rendering: 'ssr', script: 'cyrillic', a11y: 'low' },

  // ── Documentation (13) ──
  { url: 'https://developer.mozilla.org/en-US/', category: 'docs', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://docs.github.com', category: 'docs', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://react.dev', category: 'docs', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'high' },
  { url: 'https://vuejs.org/guide/introduction', category: 'docs', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://svelte.dev/docs/introduction', category: 'docs', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://nodejs.org/en/docs', category: 'docs', complexity: 'moderate', rendering: 'static', script: 'latin', a11y: 'medium' },
  { url: 'https://docs.python.org/3/', category: 'docs', complexity: 'moderate', rendering: 'static', script: 'latin', a11y: 'medium' },
  { url: 'https://doc.rust-lang.org/book/', category: 'docs', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'medium' },
  { url: 'https://tailwindcss.com/docs/installation', category: 'docs', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://www.typescriptlang.org/docs/', category: 'docs', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://kubernetes.io/docs/home/', category: 'docs', complexity: 'moderate', rendering: 'static', script: 'latin', a11y: 'medium' },
  { url: 'https://docs.aws.amazon.com', category: 'docs', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://wiki.archlinux.org', category: 'docs', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },

  // ── Social / Community (12) ──
  { url: 'https://www.reddit.com', category: 'social', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://old.reddit.com', category: 'social', complexity: 'moderate', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://lobste.rs', category: 'social', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://stackoverflow.com', category: 'social', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://dev.to', category: 'social', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://medium.com', category: 'social', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.quora.com', category: 'social', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'low' },
  { url: 'https://www.producthunt.com', category: 'social', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://mastodon.social/explore', category: 'social', complexity: 'moderate', rendering: 'csr', script: 'latin', a11y: 'high' },
  { url: 'https://www.imdb.com', category: 'social', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://letterboxd.com', category: 'social', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.goodreads.com', category: 'social', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'low' },

  // ── Data-heavy / Tables (12) ──
  { url: 'https://www.worldometers.info', category: 'data', complexity: 'complex', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://ourworldindata.org', category: 'data', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'high' },
  { url: 'https://data.worldbank.org', category: 'data', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.numbeo.com/cost-of-living/', category: 'data', complexity: 'moderate', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://www.timeanddate.com', category: 'data', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.xe.com', category: 'data', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://www.weather.gov', category: 'data', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://earthquake.usgs.gov/earthquakes/map/', category: 'data', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.flightradar24.com', category: 'data', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'low' },
  { url: 'https://www.speedtest.net', category: 'data', complexity: 'moderate', rendering: 'csr', script: 'latin', a11y: 'low' },
  { url: 'https://httparchive.org', category: 'data', complexity: 'moderate', rendering: 'static', script: 'latin', a11y: 'medium' },
  { url: 'https://caniuse.com', category: 'data', complexity: 'moderate', rendering: 'csr', script: 'latin', a11y: 'medium' },

  // ── Media-heavy (12) ──
  { url: 'https://unsplash.com', category: 'media', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.pexels.com', category: 'media', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.flickr.com/explore', category: 'media', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://www.behance.net', category: 'media', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://dribbble.com', category: 'media', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.deviantart.com', category: 'media', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'low' },
  { url: 'https://www.artstation.com', category: 'media', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'low' },
  { url: 'https://www.nationalgeographic.com', category: 'media', complexity: 'complex', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.smithsonianmag.com', category: 'media', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.500px.com', category: 'media', complexity: 'complex', rendering: 'csr', script: 'latin', a11y: 'low' },
  { url: 'https://www.gettyimages.com', category: 'media', complexity: 'complex', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://commons.wikimedia.org', category: 'media', complexity: 'moderate', rendering: 'static', script: 'mixed', a11y: 'medium' },

  // ── Tools / Utilities (12) ──
  { url: 'https://www.google.com', category: 'tools', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'high' },
  { url: 'https://duckduckgo.com', category: 'tools', complexity: 'simple', rendering: 'ssr', script: 'latin', a11y: 'high' },
  { url: 'https://www.wolframalpha.com', category: 'tools', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'medium' },
  { url: 'https://translate.google.com', category: 'tools', complexity: 'complex', rendering: 'csr', script: 'mixed', a11y: 'high' },
  { url: 'https://regex101.com', category: 'tools', complexity: 'moderate', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://jsonformatter.org', category: 'tools', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://www.base64decode.org', category: 'tools', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://www.virustotal.com', category: 'tools', complexity: 'moderate', rendering: 'csr', script: 'latin', a11y: 'medium' },
  { url: 'https://web.archive.org', category: 'tools', complexity: 'moderate', rendering: 'ssr', script: 'latin', a11y: 'medium' },
  { url: 'https://www.ssllabs.com/ssltest/', category: 'tools', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'low' },
  { url: 'https://pagespeed.web.dev', category: 'tools', complexity: 'moderate', rendering: 'csr', script: 'latin', a11y: 'high' },
  { url: 'https://validator.w3.org', category: 'tools', complexity: 'simple', rendering: 'static', script: 'latin', a11y: 'high' },

  // ── Shadow DOM / Web Components (3) - specific stress test ──
  { url: 'https://lit.dev', category: 'webcomponents', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'high' },
  { url: 'https://shoelace.style', category: 'webcomponents', complexity: 'moderate', rendering: 'hybrid', script: 'latin', a11y: 'high' },
  { url: 'https://www.youtube.com', category: 'webcomponents', complexity: 'complex', rendering: 'csr', script: 'mixed', a11y: 'medium' },
];

/* eslint-enable max-len */

// ──────────────────────────────────────────────
// Experiment Set Definitions
// ──────────────────────────────────────────────

/**
 * Set A: "Breadth" - max diversity, 1 site per niche.
 * Picks across every category, rendering type, script, and complexity
 * to test whether VG works across the full spectrum.
 * 50 sites, hand-selected for maximum axis coverage.
 */
const SET_A_URLS = [
  // news: 1 static, 1 ssr, 1 hybrid
  'https://news.ycombinator.com', 'https://www.bbc.com', 'https://www.theverge.com',
  // ecommerce: 1 ssr, 1 csr, 1 hybrid
  'https://www.zappos.com', 'https://www.target.com', 'https://www.ebay.com',
  // spa: 1 csr heavy, 1 hybrid, 1 canvas-based
  'https://github.com/explore', 'https://notion.so', 'https://excalidraw.com',
  // static: 1 minimal, 1 medium, 1 with good a11y
  'https://danluu.com', 'https://solar.lowtechmagazine.com', 'https://go.dev/blog/',
  // government: 1 US, 1 UK, 1 intl
  'https://www.usa.gov', 'https://www.gov.uk', 'https://www.who.int',
  // i18n: 1 CJK, 1 Arabic/RTL, 1 Cyrillic, 1 Indic, 1 Latin non-English
  'https://www.nhk.or.jp/news/', 'https://www.aljazeera.net', 'https://lenta.ru',
  'https://www.ndtv.com', 'https://www.lemonde.fr',
  // docs: 1 static, 1 ssr, 1 hybrid
  'https://doc.rust-lang.org/book/', 'https://developer.mozilla.org/en-US/', 'https://react.dev',
  // social: 1 static, 1 ssr, 1 csr
  'https://lobste.rs', 'https://stackoverflow.com', 'https://www.reddit.com',
  // data: 1 static tables, 1 csr charts, 1 map
  'https://www.worldometers.info', 'https://ourworldindata.org', 'https://earthquake.usgs.gov/earthquakes/map/',
  // media: 1 image grid, 1 video, 1 gallery
  'https://unsplash.com', 'https://www.nationalgeographic.com', 'https://commons.wikimedia.org',
  // tools: 1 search, 1 form, 1 interactive
  'https://duckduckgo.com', 'https://validator.w3.org', 'https://regex101.com',
  // web components / shadow DOM
  'https://lit.dev', 'https://shoelace.style', 'https://www.youtube.com',
  // fill remaining with diversity gaps: high-a11y csr, low-a11y static, complex hybrid
  'https://mastodon.social/explore', 'https://www.ikea.com', 'https://www.paulgraham.com',
  'https://www.flightradar24.com', 'https://www.canva.com', 'https://text.npr.org',
  'https://www.artstation.com', 'https://translate.google.com',
  // complex non-latin
  'https://www.globo.com', 'https://www.chosun.com',
];

/**
 * Set B: "Depth" - focused on known-hard patterns.
 * Oversamples the categories where VG is most likely to struggle:
 * heavy SPAs, shadow DOM, RTL, huge tables, canvas apps, CSR-only.
 * 50 sites, biased toward complexity.
 */
const SET_B_URLS = [
  // All SPAs (13) - the hardest category for DOM capture
  'https://github.com/explore', 'https://gitlab.com/explore', 'https://codepen.io',
  'https://stackblitz.com', 'https://figma.com', 'https://notion.so',
  'https://trello.com', 'https://www.canva.com', 'https://excalidraw.com',
  'https://codesandbox.io', 'https://vercel.com', 'https://netlify.com', 'https://render.com',
  // All CSR ecommerce (5) - complex JS rendering
  'https://www.target.com', 'https://www.ikea.com', 'https://www.wayfair.com',
  'https://www.nordstrom.com', 'https://data.worldbank.org',
  // All RTL / CJK / Indic (8) - text handling edge cases
  'https://www.aljazeera.net', 'https://arabic.cnn.com', 'https://www.nhk.or.jp/news/',
  'https://www.asahi.com', 'https://www.chosun.com', 'https://www.ndtv.com',
  'https://timesofindia.indiatimes.com', 'https://lenta.ru',
  // Shadow DOM / web components (3)
  'https://lit.dev', 'https://shoelace.style', 'https://www.youtube.com',
  // Data-heavy / huge DOM (6)
  'https://www.worldometers.info', 'https://earthquake.usgs.gov/earthquakes/map/',
  'https://www.flightradar24.com', 'https://caniuse.com',
  'https://ourworldindata.org', 'https://www.speedtest.net',
  // Complex hybrid rendering (6)
  'https://www.theverge.com', 'https://www.wired.com', 'https://www.spiegel.de',
  'https://www.globo.com', 'https://www.flickr.com/explore', 'https://www.gettyimages.com',
  // CSR social (5)
  'https://www.reddit.com', 'https://medium.com', 'https://www.quora.com',
  'https://www.producthunt.com', 'https://mastodon.social/explore',
  // CSR tools (4)
  'https://translate.google.com', 'https://regex101.com',
  'https://pagespeed.web.dev', 'https://www.virustotal.com',
];

/**
 * Set C: "Real-world" - weighted by actual web traffic patterns.
 * Mirrors what a typical developer would actually point VG at:
 * mostly SSR/hybrid sites, some SPAs, a few static pages.
 * 50 sites, distribution matches real usage.
 */
const SET_C_URLS = [
  // High-traffic news/media (8) - most common "check this page" targets
  'https://www.bbc.com', 'https://www.reuters.com', 'https://www.theguardian.com',
  'https://apnews.com', 'https://www.npr.org', 'https://arstechnica.com',
  'https://techcrunch.com', 'https://www.nature.com',
  // Popular ecommerce (6) - common client project type
  'https://www.etsy.com', 'https://www.ebay.com', 'https://www.bestbuy.com',
  'https://www.ikea.com', 'https://www.rei.com', 'https://www.bookshop.org',
  // Developer tools / SPAs (8) - what devs actually build and test
  'https://github.com/explore', 'https://vercel.com', 'https://netlify.com',
  'https://stackoverflow.com', 'https://dev.to', 'https://codepen.io',
  'https://www.producthunt.com', 'https://mastodon.social/explore',
  // Documentation (6) - devs read docs constantly
  'https://developer.mozilla.org/en-US/', 'https://react.dev', 'https://docs.github.com',
  'https://tailwindcss.com/docs/installation', 'https://nodejs.org/en/docs',
  'https://kubernetes.io/docs/home/',
  // Government / institutional (4) - a11y-conscious clients
  'https://www.gov.uk', 'https://www.usa.gov', 'https://www.nasa.gov', 'https://www.cdc.gov',
  // Popular international (6) - global user base
  'https://www.lemonde.fr', 'https://www.spiegel.de', 'https://www.elpais.com',
  'https://www.globo.com', 'https://www.ndtv.com', 'https://www.nhk.or.jp/news/',
  // Media / content (4)
  'https://unsplash.com', 'https://www.imdb.com', 'https://www.nationalgeographic.com',
  'https://commons.wikimedia.org',
  // Tools (4)
  'https://www.google.com', 'https://duckduckgo.com', 'https://web.archive.org',
  'https://translate.google.com',
  // Data (4)
  'https://ourworldindata.org', 'https://www.weather.gov', 'https://www.xe.com',
  'https://www.timeanddate.com',
];

/** Map set name to URL list for lookup. */
const EXPERIMENT_SETS = { a: SET_A_URLS, b: SET_B_URLS, c: SET_C_URLS };

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Get sites for a specific experiment set or the full pool.
 * @param {object} [options]
 * @param {string} [options.set] - Experiment set: 'a', 'b', 'c', or null for full pool
 * @param {string} [options.category] - Filter to a single category
 * @param {string} [options.rendering] - Filter by rendering type
 * @param {string} [options.script] - Filter by script type
 * @param {string} [options.complexity] - Filter by complexity
 * @param {number} [options.limit] - Max sites to return
 * @returns {Array<{ url: string, category: string, complexity: string, rendering: string, script: string, a11y: string }>}
 */
export function getSites(options = {}) {
  let list;

  if (options.set && EXPERIMENT_SETS[options.set]) {
    // Filter full pool to only URLs in the requested set
    const urls = new Set(EXPERIMENT_SETS[options.set]);
    list = SITES.filter((s) => urls.has(s.url));
  } else {
    list = [...SITES];
  }

  if (options.category) list = list.filter((s) => s.category === options.category);
  if (options.rendering) list = list.filter((s) => s.rendering === options.rendering);
  if (options.script) list = list.filter((s) => s.script === options.script);
  if (options.complexity) list = list.filter((s) => s.complexity === options.complexity);
  if (options.limit && options.limit > 0) list = list.slice(0, options.limit);

  return list;
}

/**
 * Get all unique values for a diversity axis.
 * @param {'category'|'complexity'|'rendering'|'script'|'a11y'} axis
 * @returns {string[]}
 */
export function getAxisValues(axis) {
  return [...new Set(SITES.map((s) => s[axis]))].filter(Boolean);
}

/**
 * Get diversity distribution stats for the full pool or a set.
 * Useful for verifying a set actually covers the axes.
 * @param {string} [setName] - 'a', 'b', 'c', or null for full pool
 * @returns {object} Counts per axis value
 */
export function getDiversityStats(setName) {
  const sites = setName ? getSites({ set: setName }) : SITES;
  const axes = ['category', 'complexity', 'rendering', 'script', 'a11y'];
  const stats = {};
  for (const axis of axes) {
    stats[axis] = {};
    for (const s of sites) {
      stats[axis][s[axis]] = (stats[axis][s[axis]] || 0) + 1;
    }
  }
  stats.total = sites.length;
  return stats;
}

/** Available experiment set names. */
export const EXPERIMENT_SET_NAMES = Object.keys(EXPERIMENT_SETS);

/** Total number of sites in the full pool. */
export const SITE_COUNT = SITES.length;
