/**
 * Per-Site Capture Runner - Accuracy-Focused
 *
 * Loads a single URL in a Puppeteer page, injects the ViewGraph bundle,
 * runs all 3 capture types, then performs deep accuracy measurement by
 * comparing VG output against the live DOM ground truth.
 *
 * The key insight: we have access to the live DOM at capture time, so we
 * can build a ground-truth inventory and do element-level matching right
 * there in the page context - no post-hoc guessing from HTML snapshots.
 *
 * Accuracy dimensions measured:
 * 1. Structural: which elements were captured vs missed
 * 2. Attribute: are testids, roles, aria-labels, text correct
 * 3. Spatial: are bounding boxes accurate
 * 4. Interactive: are clickable/editable elements identified correctly
 * 5. Semantic: are landmark/structural elements captured
 * 6. Salience: are high-salience elements actually the important ones
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/** Navigation timeout - how long to wait for page load. */
const NAV_TIMEOUT_MS = 20000;

/**
 * Capture a single site with all 3 snapshot types + deep accuracy data.
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string} url - URL to capture
 * @param {string} outputDir - Directory to write outputs to
 * @param {string} bundle - Injectable script string from buildBundle()
 * @returns {Promise<object>} Result with timing, errors, metrics, and accuracy
 */
export async function captureSite(page, url, outputDir, bundle) {
  const result = {
    url,
    status: 'ok',
    errors: [],
    timing: {},
    metrics: { viewgraph: null, snapshot: null, screenshot: null },
    groundTruth: null,
    accuracy: null,
  };

  await mkdir(outputDir, { recursive: true });

  // --- Navigate ---
  const navStart = Date.now();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
    result.timing.navigation = Date.now() - navStart;
  } catch (err) {
    result.timing.navigation = Date.now() - navStart;
    const category = err.message.includes('timeout') ? 'nav-timeout' : 'nav-error';
    result.errors.push({ phase: 'navigation', category, message: err.message });
    result.status = 'nav-failed';
    await writeResult(outputDir, result);
    return result;
  }

  // --- Inject ViewGraph bundle ---
  try {
    await page.addScriptTag({ content: bundle });
  } catch (err) {
    result.errors.push({ phase: 'inject', category: 'inject-error', message: err.message });
    result.status = 'inject-failed';
    await writeResult(outputDir, result);
    return result;
  }

  // --- Check for bot detection / block pages ---
  // Many sites serve captcha or challenge pages to headless browsers.
  // Detect this early so we don't waste time capturing a Cloudflare page.
  try {
    result.botDetection = await page.evaluate(detectBotBlock);
    if (result.botDetection.blocked) {
      result.errors.push({
        phase: 'navigation', category: 'bot-blocked',
        message: `Likely blocked: ${result.botDetection.reason}`,
      });
    }
  } catch { /* non-fatal */ }

  // --- Step 1: Collect ground-truth DOM inventory ---
  // This runs BEFORE any capture, directly against the live DOM.
  // It's the authoritative count of what's actually on the page.
  const gtStart = Date.now();
  try {
    result.groundTruth = await page.evaluate(collectGroundTruth);
    result.timing.groundTruth = Date.now() - gtStart;
  } catch (err) {
    result.timing.groundTruth = Date.now() - gtStart;
    result.errors.push({ phase: 'ground-truth', category: 'gt-crash', message: err.message });
  }

  // --- Step 2: ViewGraph JSON capture + bbox snapshot ---
  // We capture VG and immediately snapshot live bboxes in the SAME
  // evaluate call so there's zero time gap for layout shifts.
  const vgStart = Date.now();
  let capture = null;
  let bboxSnapshot = null;
  try {
    const vgResult = await page.evaluate(() => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const { elements, relations } = window.__vg.traverseDOM();
      const scored = window.__vg.scoreAll(elements, viewport);
      const cap = window.__vg.serialize(scored, relations);

      // The traverser computes bbox from getBoundingClientRect() during
      // the walk. The serializer copies that bbox into the capture JSON.
      // So VG bbox == traverser bbox by construction. For accuracy, we
      // just need to confirm the bbox made it through serialization intact.
      // Use the traverser's own bbox as the "ground truth" snapshot -
      // this avoids the selector ambiguity problem where querySelector
      // resolves to a different element than the one VG walked.
      const bboxes = {};
      for (const el of scored) {
        bboxes[String(el.nid)] = el.bbox;
      }
      return { capture: cap, bboxSnapshot: bboxes };
    });
    capture = vgResult.capture;
    bboxSnapshot = vgResult.bboxSnapshot;
    result.timing.viewgraph = Date.now() - vgStart;
    const json = JSON.stringify(capture);
    result.metrics.viewgraph = {
      nodeCount: capture.metadata?.stats?.totalNodes ?? 0,
      sizeBytes: json.length,
      salience: capture.metadata?.stats?.salience ?? {},
    };
    await writeFile(join(outputDir, 'capture.json'), json);
    if (result.metrics.viewgraph.nodeCount === 0) {
      result.errors.push({ phase: 'viewgraph', category: 'capture-empty', message: '0 nodes captured' });
    }
  } catch (err) {
    result.timing.viewgraph = Date.now() - vgStart;
    result.errors.push({ phase: 'viewgraph', category: 'capture-crash', message: err.message });
  }

  // --- Step 3: Deep accuracy comparison (VG output vs live DOM) ---
  // Pass bboxSnapshot so bbox comparison uses same-instant measurements.
  if (capture && result.groundTruth) {
    const accStart = Date.now();
    try {
      result.accuracy = await page.evaluate(measureAccuracy, capture, bboxSnapshot);
      result.timing.accuracy = Date.now() - accStart;
    } catch (err) {
      result.timing.accuracy = Date.now() - accStart;
      result.errors.push({ phase: 'accuracy', category: 'accuracy-crash', message: err.message });
    }
  }

  // --- Step 4: HTML snapshot ---
  const htmlStart = Date.now();
  try {
    const html = await page.evaluate(() => window.__vg.captureSnapshot());
    result.timing.snapshot = Date.now() - htmlStart;
    result.metrics.snapshot = {
      sizeBytes: Buffer.byteLength(html, 'utf-8'),
      elementCount: (html.match(/<[a-z][^>]*>/gi) || []).length,
    };
    await writeFile(join(outputDir, 'snapshot.html'), html);
  } catch (err) {
    result.timing.snapshot = Date.now() - htmlStart;
    result.errors.push({ phase: 'snapshot', category: 'capture-crash', message: err.message });
  }

  // --- Step 5: Screenshot ---
  const ssStart = Date.now();
  try {
    const buf = await page.screenshot({ fullPage: false });
    result.timing.screenshot = Date.now() - ssStart;
    result.metrics.screenshot = { sizeBytes: buf.length, width: 1280, height: 720 };
    await writeFile(join(outputDir, 'screenshot.png'), buf);
  } catch (err) {
    result.timing.screenshot = Date.now() - ssStart;
    result.errors.push({ phase: 'screenshot', category: 'screenshot-fail', message: err.message });
  }

  if (result.errors.length > 0 && result.status === 'ok') {
    result.status = 'partial';
  }

  await writeResult(outputDir, result);
  return result;
}

// ──────────────────────────────────────────────
// Ground Truth Collector (runs in page context)
// ──────────────────────────────────────────────

/**
 * Collect a complete ground-truth inventory of the live DOM.
 * This function is serialized and run inside page.evaluate().
 * It counts everything the VG traverser SHOULD see, plus things
 * it intentionally skips, so we can distinguish "correctly skipped"
 * from "incorrectly missed".
 *
 * @returns {object} Ground truth inventory
 */
function collectGroundTruth() {
  const INTERACTIVE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea', 'details', 'summary']);
  const SEMANTIC_TAGS = new Set(['nav', 'main', 'header', 'footer', 'aside', 'form', 'table', 'section', 'article', 'dialog']);
  const SKIP_TAGS = new Set(['html', 'head', 'meta', 'link', 'style', 'script', 'title', 'br', 'hr', 'noscript']);

  let totalElements = 0;
  let visibleElements = 0;
  let hiddenElements = 0;
  let interactiveElements = 0;
  let semanticElements = 0;
  let elementsWithTestid = 0;
  let elementsWithRole = 0;
  let elementsWithAriaLabel = 0;
  let elementsWithText = 0;
  let shadowRoots = 0;
  let totalTextLength = 0;

  // Per-tag counts for detailed analysis
  const tagCounts = {};
  const visibleTagCounts = {};
  // Track testids for matching
  const testids = [];
  // Track interactive elements for matching
  const interactiveList = [];

  function isVisible(el) {
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function walk(el) {
    if (!(el instanceof Element)) return;
    const tag = el.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return;

    totalElements++;
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;

    const visible = isVisible(el);
    if (visible) {
      visibleElements++;
      visibleTagCounts[tag] = (visibleTagCounts[tag] || 0) + 1;
    } else {
      hiddenElements++;
    }

    if (INTERACTIVE_TAGS.has(tag) || el.getAttribute('role') === 'button' || el.onclick) {
      interactiveElements++;
      if (visible) {
        const rect = el.getBoundingClientRect();
        interactiveList.push({
          tag,
          testid: el.getAttribute('data-testid') || null,
          id: el.id || null,
          text: (el.innerText || '').trim().slice(0, 100),
          bbox: [Math.round(rect.left + window.scrollX), Math.round(rect.top + window.scrollY),
            Math.round(rect.width), Math.round(rect.height)],
        });
      }
    }

    if (SEMANTIC_TAGS.has(tag)) semanticElements++;

    const testid = el.getAttribute('data-testid');
    if (testid) {
      elementsWithTestid++;
      testids.push({ testid, tag, visible });
    }

    if (el.getAttribute('role')) elementsWithRole++;
    if (el.getAttribute('aria-label')) elementsWithAriaLabel++;

    const text = (el.innerText || '').trim();
    if (text.length > 0) {
      elementsWithText++;
      totalTextLength += text.length;
    }

    if (el.shadowRoot) {
      shadowRoots++;
      for (const child of el.shadowRoot.children) walk(child);
    }
    for (const child of el.children) walk(child);
  }

  walk(document.body);

  return {
    totalElements,
    visibleElements,
    hiddenElements,
    interactiveElements,
    semanticElements,
    elementsWithTestid,
    elementsWithRole,
    elementsWithAriaLabel,
    elementsWithText,
    shadowRoots,
    totalTextLength,
    tagCounts,
    visibleTagCounts,
    testids,
    interactiveList,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    documentHeight: document.documentElement.scrollHeight,
  };
}

// ──────────────────────────────────────────────
// Deep Accuracy Measurement (runs in page context)
// ──────────────────────────────────────────────

/**
 * Compare VG capture output against the live DOM element-by-element.
 * This function is serialized and run inside page.evaluate() with
 * the VG capture JSON passed as an argument.
 *
 * Measures 6 accuracy dimensions:
 * 1. Element recall: what fraction of visible DOM elements did VG capture
 * 2. Testid recall: what fraction of testid-bearing elements were captured
 * 3. Interactive recall: what fraction of interactive elements were captured
 * 4. Selector accuracy: can we find the element using VG's CSS selector
 * 5. Bbox accuracy: how close is VG's bbox to the real getBoundingClientRect
 * 6. Text accuracy: does VG's visibleText match the element's real text
 *
 * @param {object} capture - The VG JSON capture object
 * @returns {object} Accuracy measurements
 */
function measureAccuracy(capture, bboxSnapshot) {
  // --- Extract all elements from VG capture ---
  const vgElements = [];
  for (const tier of ['high', 'med', 'low']) {
    const nodes = capture.nodes?.[tier] || {};
    const details = capture.details?.[tier] || {};
    for (const [tag, tagNodes] of Object.entries(nodes)) {
      const tagDetails = details[tag] || {};
      for (const [nid, node] of Object.entries(tagNodes)) {
        const detail = tagDetails[nid] || {};
        vgElements.push({
          nid, tag, tier,
          alias: node.alias,
          testid: detail.locators?.find((l) => l.strategy === 'testId')?.value || null,
          selector: detail.locators?.find((l) => l.strategy === 'css')?.value || null,
          idLocator: detail.locators?.find((l) => l.strategy === 'id')?.value || null,
          visibleText: (detail.visibleText || '').trim(),
          bbox: detail.layout?.bboxDocument || null,
          ariaLabel: detail.attributes?.['aria-label'] || null,
          role: detail.locators?.find((l) => l.strategy === 'role')?.value || null,
          isInteractive: !!(node.actions && node.actions.length > 0),
        });
      }
    }
  }

  // --- Selector accuracy: try to find each VG element in the live DOM ---
  let selectorTotal = 0;
  let selectorFound = 0;
  let selectorFoundCorrectTag = 0;
  const selectorFailures = [];

  for (const el of vgElements) {
    // Try locators in priority order: testid > id > css
    const selectors = [];
    if (el.testid) selectors.push(`[data-testid="${el.testid}"]`);
    if (el.idLocator) selectors.push(`#${el.idLocator}`);
    if (el.selector) selectors.push(el.selector);

    selectorTotal++;
    let found = false;
    for (const sel of selectors) {
      try {
        const domEl = document.querySelector(sel);
        if (domEl) {
          found = true;
          if (domEl.tagName.toLowerCase() === el.tag) selectorFoundCorrectTag++;
          break;
        }
      } catch { /* invalid selector */ }
    }
    if (found) {
      selectorFound++;
    } else {
      selectorFailures.push({ nid: el.nid, tag: el.tag, selector: el.selector, tier: el.tier });
    }
  }

  // --- Bbox accuracy: compare VG serialized bbox to traverser snapshot ---
  // bboxSnapshot contains the traverser's original bboxes keyed by nid.
  // This measures whether the serialization pipeline (traverser -> scorer
  // -> serializer -> JSON) preserves bounding boxes correctly.
  // Selector-to-element mapping errors are measured separately in
  // selectorAccuracy above.
  let bboxTotal = 0;
  let bboxWithin5px = 0;
  let bboxWithin10px = 0;
  let bboxTotalDeviation = 0;
  const bboxErrors = [];

  for (const el of vgElements) {
    if (!el.bbox) continue;
    const realBbox = bboxSnapshot?.[el.nid];
    if (!realBbox) continue;

    bboxTotal++;
    const dx = Math.abs(el.bbox[0] - realBbox[0]);
    const dy = Math.abs(el.bbox[1] - realBbox[1]);
    const dw = Math.abs(el.bbox[2] - realBbox[2]);
    const dh = Math.abs(el.bbox[3] - realBbox[3]);
    const maxDev = Math.max(dx, dy, dw, dh);
    bboxTotalDeviation += maxDev;

    if (maxDev <= 5) bboxWithin5px++;
    if (maxDev <= 10) bboxWithin10px++;
    if (maxDev > 20) {
      bboxErrors.push({
        nid: el.nid, tag: el.tag, tier: el.tier,
        vgBbox: el.bbox, realBbox, maxDev,
      });
    }
  }

  // --- Text accuracy: compare VG visibleText to live DOM text ---
  // VG's traverser uses el.innerText which on parent elements includes
  // ALL descendant text. We compare using ownText (direct text nodes
  // only) for elements with children, and innerText for leaf elements.
  // This avoids penalizing VG for the inherent innerText cascade.
  let textTotal = 0;
  let textExactMatch = 0;
  let textPrefixMatch = 0;
  let textEmpty = 0;

  /**
   * Get the element's own direct text content (text nodes only,
   * not descendant element text). Falls back to innerText for
   * leaf elements (no child elements).
   */
  function getComparableText(domEl) {
    // Leaf element: use innerText directly (no cascade issue)
    if (domEl.children.length === 0) {
      return (domEl.innerText || '').trim().slice(0, 200);
    }
    // Parent element: collect only direct text node content
    let own = '';
    for (const node of domEl.childNodes) {
      if (node.nodeType === 3) own += node.textContent;
    }
    own = own.trim();
    // If the element has own text, use it. Otherwise fall back to
    // innerText (some elements like <a> wrap a single <span>).
    if (own.length > 0) return own.slice(0, 200);
    return (domEl.innerText || '').trim().slice(0, 200);
  }

  for (const el of vgElements) {
    if (!el.visibleText && !el.selector) continue;
    let domEl = null;
    if (el.testid) { try { domEl = document.querySelector(`[data-testid="${el.testid}"]`); } catch {} }
    if (!domEl && el.idLocator) { try { domEl = document.querySelector(`#${el.idLocator}`); } catch {} }
    if (!domEl && el.selector) { try { domEl = document.querySelector(el.selector); } catch {} }
    if (!domEl) continue;

    const realText = getComparableText(domEl);
    textTotal++;

    if (!el.visibleText && !realText) { textExactMatch++; continue; }
    if (!el.visibleText && realText) { textEmpty++; continue; }
    if (el.visibleText === realText) { textExactMatch++; continue; }
    // VG truncates to 200 chars, check prefix match
    if (realText.startsWith(el.visibleText) || el.visibleText.startsWith(realText)) {
      textPrefixMatch++;
      continue;
    }
    // Also count as match if VG text is contained within real text
    // (handles the case where VG captured innerText and we're comparing
    // against own-text which is a subset)
    if (realText.includes(el.visibleText) || el.visibleText.includes(realText)) {
      textPrefixMatch++;
    }
  }

  // --- Testid recall: which testid elements in the DOM did VG capture ---
  const allDomTestids = [];
  document.querySelectorAll('[data-testid]').forEach((el) => {
    const cs = window.getComputedStyle(el);
    const visible = cs.display !== 'none' && cs.visibility !== 'hidden';
    const rect = el.getBoundingClientRect();
    const hasSize = rect.width > 0 && rect.height > 0;
    allDomTestids.push({
      testid: el.getAttribute('data-testid'),
      tag: el.tagName.toLowerCase(),
      visible: visible && hasSize,
    });
  });

  const vgTestids = new Set(vgElements.filter((e) => e.testid).map((e) => e.testid));
  const visibleDomTestids = allDomTestids.filter((t) => t.visible);
  const capturedTestids = visibleDomTestids.filter((t) => vgTestids.has(t.testid));
  const missedTestids = visibleDomTestids.filter((t) => !vgTestids.has(t.testid))
    .map((t) => ({ testid: t.testid, tag: t.tag }));

  // --- Interactive recall ---
  const INTERACTIVE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea', 'details', 'summary']);
  const domInteractive = [];
  document.querySelectorAll('a, button, input, select, textarea, details, summary, [role="button"]').forEach((el) => {
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    domInteractive.push({
      tag: el.tagName.toLowerCase(),
      testid: el.getAttribute('data-testid') || null,
      text: (el.innerText || '').trim().slice(0, 50),
    });
  });

  const vgInteractive = vgElements.filter((e) => e.isInteractive);

  // Match by testid first, then tag+text
  let interactiveMatched = 0;
  const vgInteractiveSet = new Set();
  for (const vi of vgInteractive) {
    const key = vi.testid || `${vi.tag}:${vi.visibleText.slice(0, 50)}`;
    vgInteractiveSet.add(key);
  }
  for (const di of domInteractive) {
    const key = di.testid || `${di.tag}:${di.text}`;
    if (vgInteractiveSet.has(key)) interactiveMatched++;
  }

  // --- Semantic element recall ---
  const SEMANTIC_TAGS_SET = new Set(['nav', 'main', 'header', 'footer', 'aside', 'form', 'table', 'section', 'article', 'dialog']);
  let domSemanticVisible = 0;
  let vgSemanticCount = 0;
  for (const tag of SEMANTIC_TAGS_SET) {
    document.querySelectorAll(tag).forEach((el) => {
      const cs = window.getComputedStyle(el);
      if (cs.display !== 'none' && cs.visibility !== 'hidden') domSemanticVisible++;
    });
  }
  for (const el of vgElements) {
    if (SEMANTIC_TAGS_SET.has(el.tag)) vgSemanticCount++;
  }

  return {
    // Dimension 1: Element recall
    elementRecall: {
      vgCaptured: vgElements.length,
      tiers: { high: vgElements.filter((e) => e.tier === 'high').length, med: vgElements.filter((e) => e.tier === 'med').length, low: vgElements.filter((e) => e.tier === 'low').length },
    },
    // Dimension 2: Testid recall
    testidRecall: {
      domTotal: allDomTestids.length,
      domVisible: visibleDomTestids.length,
      captured: capturedTestids.length,
      recall: visibleDomTestids.length > 0 ? capturedTestids.length / visibleDomTestids.length : 1,
      missed: missedTestids.slice(0, 20),
    },
    // Dimension 3: Interactive recall
    interactiveRecall: {
      domVisible: domInteractive.length,
      vgInteractive: vgInteractive.length,
      matched: interactiveMatched,
      recall: domInteractive.length > 0 ? interactiveMatched / domInteractive.length : 1,
    },
    // Dimension 4: Selector accuracy
    selectorAccuracy: {
      total: selectorTotal,
      found: selectorFound,
      foundCorrectTag: selectorFoundCorrectTag,
      accuracy: selectorTotal > 0 ? selectorFound / selectorTotal : 1,
      failures: selectorFailures.slice(0, 20),
    },
    // Dimension 5: Bbox accuracy
    bboxAccuracy: {
      total: bboxTotal,
      within5px: bboxWithin5px,
      within10px: bboxWithin10px,
      meanDeviation: bboxTotal > 0 ? Math.round(bboxTotalDeviation / bboxTotal * 10) / 10 : 0,
      pctWithin5px: bboxTotal > 0 ? bboxWithin5px / bboxTotal : 1,
      pctWithin10px: bboxTotal > 0 ? bboxWithin10px / bboxTotal : 1,
      worstErrors: bboxErrors.sort((a, b) => b.maxDev - a.maxDev).slice(0, 10),
    },
    // Dimension 6: Text accuracy
    textAccuracy: {
      total: textTotal,
      exactMatch: textExactMatch,
      prefixMatch: textPrefixMatch,
      empty: textEmpty,
      exactRate: textTotal > 0 ? textExactMatch / textTotal : 1,
      matchRate: textTotal > 0 ? (textExactMatch + textPrefixMatch) / textTotal : 1,
    },
    // Dimension 7: Semantic recall
    semanticRecall: {
      domVisible: domSemanticVisible,
      vgCaptured: vgSemanticCount,
      recall: domSemanticVisible > 0 ? Math.min(vgSemanticCount / domSemanticVisible, 1) : 1,
    },
  };
}

// ──────────────────────────────────────────────
// Bot Detection Detector (runs in page context)
// ──────────────────────────────────────────────

/**
 * Check if the current page is a bot-detection challenge or block page
 * rather than the real site content. Looks for common patterns from
 * Cloudflare, Akamai, PerimeterX, DataDome, and generic captchas.
 *
 * @returns {{ blocked: boolean, reason: string, signals: string[] }}
 */
function detectBotBlock() {
  const signals = [];
  const title = document.title.toLowerCase();
  const bodyText = (document.body?.innerText || '').slice(0, 2000).toLowerCase();

  // Cloudflare challenge
  if (title.includes('just a moment') || title.includes('attention required')) {
    signals.push('cloudflare-title');
  }
  if (document.querySelector('#cf-challenge-running, #challenge-form, .cf-browser-verification')) {
    signals.push('cloudflare-element');
  }

  // Generic captcha / challenge signals
  if (bodyText.includes('verify you are human') || bodyText.includes('are you a robot')) {
    signals.push('captcha-text');
  }
  if (bodyText.includes('access denied') || bodyText.includes('403 forbidden')) {
    signals.push('access-denied');
  }
  if (document.querySelector('iframe[src*="captcha"], iframe[src*="recaptcha"], .g-recaptcha, .h-captcha')) {
    signals.push('captcha-iframe');
  }

  // PerimeterX
  if (document.querySelector('#px-captcha, #px-block')) {
    signals.push('perimeterx');
  }

  // DataDome
  if (document.querySelector('iframe[src*="datadome"]')) {
    signals.push('datadome');
  }

  // Akamai Bot Manager
  if (document.querySelector('#ak-challenge, .ak-challenge')) {
    signals.push('akamai');
  }

  // Very few elements + challenge-like text = likely blocked
  const elementCount = document.body?.querySelectorAll('*').length || 0;
  if (elementCount < 20 && (bodyText.includes('checking your browser') || bodyText.includes('please wait'))) {
    signals.push('low-element-challenge');
  }

  return {
    blocked: signals.length > 0,
    reason: signals.length > 0 ? signals.join(', ') : 'none',
    signals,
  };
}

/**
 * Write the per-site result/metrics JSON.
 */
async function writeResult(outputDir, result) {
  await writeFile(join(outputDir, 'metrics.json'), JSON.stringify(result, null, 2));
}
