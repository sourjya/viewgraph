# Known Capture Limitations

ViewGraph captures the rendered DOM from Chrome and Firefox. Some content types and frameworks have structural limitations that prevent full capture. This page documents them explicitly so you know what to expect.

## React Native / Expo

**Status:** Not supported. Browser extension cannot reach the native layer.

React Native renders to native platform views (iOS UIKit, Android Views), not to a browser DOM. ViewGraph's content script runs inside a web page and has no access to native rendering.

**Workaround:** If your React Native app uses [React Native Web](https://necolas.github.io/react-native-web/) for a web target, ViewGraph captures that web rendering normally. The native mobile rendering remains out of scope.

## Svelte

**Status:** Partial support. DOM capture works. Component names are limited.

Svelte compiles away its component boundaries at build time. Unlike React (which preserves `__REACT_FIBER__` at runtime) or Vue (which exposes `__vue_app__`), Svelte's compiled output is plain DOM elements with no runtime component metadata.

**What works:**
- Full DOM capture (elements, styles, accessibility, enrichment)
- All 41 MCP tools
- Annotations and exports
- Accessibility auditing

**What doesn't work:**
- Component name capture (the `components` enrichment collector cannot detect Svelte component boundaries)
- Component-level source mapping (falls back to selector-based `find_source`)

**Workaround:** Add `data-testid` attributes to key Svelte components. ViewGraph's locator strategy prioritizes testids, making captures resilient regardless of framework.

## Canvas / WebGL

**Status:** Element captured, content opaque.

ViewGraph captures the `<canvas>` element itself (its position, size, attributes, accessibility state) but cannot see what is drawn on the canvas. This affects:
- Drawing tools (Excalidraw, tldraw)
- Chart libraries that render to canvas (some Chart.js configurations)
- Game interfaces
- Map tiles (Google Maps, Mapbox GL)

**Workaround:** Annotate canvas elements manually. ViewGraph captures your annotation with the canvas element's bounding box and attributes, giving the agent enough context to locate the component in source code.

## Cross-Origin Iframes

**Status:** Host element captured, iframe content invisible.

The Same-Origin Policy prevents ViewGraph's content script from accessing DOM inside cross-origin iframes. This affects:
- Embedded payment processors (Stripe Elements, PayPal)
- Third-party authentication widgets (Auth0 Lock, Google Sign-In)
- Embedded content (YouTube, Vimeo, social media widgets)

**What works:** The `<iframe>` element itself is captured with its `src` attribute, dimensions, and position. Same-origin iframes are fully traversed.

## Closed Shadow DOM

**Status:** Host element captured, shadow content invisible.

Web components with `attachShadow({ mode: 'closed' })` prevent external access to their shadow root. ViewGraph traverses open shadow roots but cannot pierce closed ones.

**What works:** The host element is captured. Open-mode shadow roots (the vast majority) are fully traversed.

## Print Stylesheets

**Status:** Not captured.

ViewGraph captures screen styles, not print layout. The `@media print` stylesheet is not applied during capture.

## Hover / Focus States

**Status:** Captured only if active at capture time.

ViewGraph captures a point-in-time snapshot. Hover effects and focus rings are only captured if the user triggers them before clicking the ViewGraph icon. CSS `:hover` and `:focus` pseudo-class styles are not captured in their inactive state.

**Workaround:** Hover over or focus the element, then capture. The computed styles at that moment will include the hover/focus state.
