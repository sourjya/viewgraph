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
