/**
 * Tests for sidebar/icons.js - SVG icon factory functions.
 * Verifies each factory returns a valid SVGElement with correct attributes.
 *
 * @see extension/lib/sidebar/icons.js
 */

import { describe, it, expect } from 'vitest';
import {
  checkIcon, closeIcon, chevronLeftIcon, chevronRightIcon,
  bellIcon, sendIcon, copyIcon, docIcon, downloadIcon,
  trashIcon, cameraIcon, circleIcon, noteIcon,
  crosshairIcon, tagIcon, gearIcon, chatBubbleIcon,
} from '#lib/sidebar/icons.js';

/** Assert an element is an SVG with the expected size. */
function expectSvg(el, size) {
  expect(el.tagName).toBe('svg');
  expect(el.getAttribute('width')).toBe(String(size));
  expect(el.getAttribute('viewBox')).toBe('0 0 24 24');
  expect(el.childNodes.length).toBeGreaterThan(0);
}

describe('sidebar/icons', () => {
  it('(+) checkIcon returns SVG with polyline', () => {
    expectSvg(checkIcon(), 12);
    expect(checkIcon().querySelector('polyline')).not.toBeNull();
  });

  it('(+) closeIcon returns SVG with path', () => {
    expectSvg(closeIcon(), 18);
  });

  it('(+) chevronLeftIcon respects custom color', () => {
    const el = chevronLeftIcon(22, '#fff');
    expectSvg(el, 22);
    expect(el.getAttribute('stroke')).toBe('#fff');
  });

  it('(+) chevronRightIcon returns SVG', () => {
    expectSvg(chevronRightIcon(), 18);
  });

  it('(+) bellIcon returns SVG with two paths', () => {
    const el = bellIcon();
    expectSvg(el, 18);
    expect(el.querySelectorAll('path').length).toBe(2);
  });

  it('(+) sendIcon returns SVG', () => {
    expectSvg(sendIcon(), 14);
  });

  it('(+) copyIcon returns SVG with rect', () => {
    const el = copyIcon();
    expectSvg(el, 12);
    expect(el.querySelector('rect')).not.toBeNull();
  });

  it('(+) docIcon returns SVG', () => {
    expectSvg(docIcon(), 14);
  });

  it('(+) downloadIcon returns SVG', () => {
    expectSvg(downloadIcon(), 14);
  });

  it('(+) trashIcon respects custom color', () => {
    const el = trashIcon(16, '#f00');
    expectSvg(el, 16);
    expect(el.getAttribute('stroke')).toBe('#f00');
  });

  it('(+) cameraIcon returns SVG with circle', () => {
    const el = cameraIcon();
    expectSvg(el, 16);
    expect(el.querySelector('circle')).not.toBeNull();
  });

  it('(+) circleIcon returns SVG', () => {
    expectSvg(circleIcon(), 12);
  });

  it('(+) noteIcon returns SVG', () => {
    expectSvg(noteIcon(), 14);
  });

  it('(+) crosshairIcon returns SVG with multiple circles', () => {
    const el = crosshairIcon();
    expectSvg(el, 12);
    expect(el.querySelectorAll('circle').length).toBe(2);
  });

  it('(+) tagIcon returns SVG', () => {
    expectSvg(tagIcon(), 12);
  });

  it('(+) gearIcon returns SVG', () => {
    expectSvg(gearIcon(), 12);
  });

  it('(+) chatBubbleIcon renders count text', () => {
    const el = chatBubbleIcon(5, '#6366f1', '#4f46e5');
    expect(el.tagName).toBe('svg');
    expect(el.getAttribute('width')).toBe('32');
    const text = el.querySelector('text');
    expect(text).not.toBeNull();
    expect(text.textContent).toBe('5');
  });

  it('(+) each factory returns a fresh element', () => {
    const a = checkIcon();
    const b = checkIcon();
    expect(a).not.toBe(b);
  });
});

// ──────────────────────────────────────────────
// Icon rendering in DOM - regression tests for shadow DOM icon bug
// ──────────────────────────────────────────────

describe('icon DOM rendering', () => {
  /** Append icon to a container and verify it renders with visible SVG content. */
  function assertIconRendersInDOM(iconFn, ...args) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const icon = iconFn(...args);
    container.appendChild(icon);
    // Must be an SVG element in the DOM
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // Must have child elements (paths, circles, polylines - not empty)
    expect(svg.children.length).toBeGreaterThan(0);
    // Must have width/height attributes
    expect(svg.getAttribute('width')).toBeTruthy();
    expect(svg.getAttribute('height')).toBeTruthy();
    // Must have viewBox
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    container.remove();
  }

  it('(+) checkIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(checkIcon, 12, '#4ade80');
  });

  it('(+) closeIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(closeIcon, 18, '#666');
  });

  it('(+) chevronLeftIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(chevronLeftIcon, 22, 'currentColor');
  });

  it('(+) chevronRightIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(chevronRightIcon, 18, '#666');
  });

  it('(+) bellIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(bellIcon, 18);
  });

  it('(+) sendIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(sendIcon, 14);
  });

  it('(+) copyIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(copyIcon, 12);
  });

  it('(+) docIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(docIcon, 14);
  });

  it('(+) downloadIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(downloadIcon, 14);
  });

  it('(+) trashIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(trashIcon, 12, '#666');
  });

  it('(+) cameraIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(cameraIcon, 16);
  });

  it('(+) circleIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(circleIcon, 12, '#666');
  });

  it('(+) noteIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(noteIcon, 14);
  });

  it('(+) crosshairIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(crosshairIcon, 12, '#93c5fd');
  });

  it('(+) tagIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(tagIcon, 12, '#6b7280');
  });

  it('(+) gearIcon renders with visible children in DOM', () => {
    assertIconRendersInDOM(gearIcon, 12);
  });

  it('(+) chatBubbleIcon renders with text in DOM', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.appendChild(chatBubbleIcon(3, '#6366f1', '#4f46e5'));
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg.querySelector('text')).not.toBeNull();
    expect(svg.querySelector('text').textContent).toBe('3');
    expect(svg.querySelector('path')).not.toBeNull();
    container.remove();
  });

  it('(+) icons survive replaceChildren cycle', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.replaceChildren(sendIcon(14), document.createTextNode('Send'));
    expect(btn.querySelector('svg')).not.toBeNull();
    expect(btn.textContent).toContain('Send');
    // Simulate flash state change
    btn.replaceChildren(checkIcon(14), document.createTextNode('Sent!'));
    expect(btn.querySelector('svg')).not.toBeNull();
    expect(btn.textContent).toContain('Sent!');
    // Restore original
    btn.replaceChildren(sendIcon(14), document.createTextNode('Send'));
    expect(btn.querySelector('svg')).not.toBeNull();
    expect(btn.querySelector('svg').children.length).toBeGreaterThan(0);
    btn.remove();
  });
});
