/**
 * @viewgraph/playwright - TypeScript Type Definitions
 *
 * Strict types for the ViewGraph Playwright fixture API and capture payloads.
 * Enables full type inference in strict TypeScript projects.
 *
 * @see packages/playwright/index.js
 * @see .kiro/specs/playwright-strict-types/requirements.md
 */

import type { Page } from '@playwright/test';

// ── Capture Payload Types ──

export interface ViewGraphMetadata {
  format: 'viewgraph-v2';
  version: string;
  url: string;
  title: string;
  timestamp: string;
  viewport: { width: number; height: number };
  captureMode: 'playwright' | 'playwright-review' | 'extension';
  label?: string;
  stats: {
    totalNodes: number;
    salience: { high: number; med: number; low: number };
  };
}

export interface ViewGraphNode {
  nid: number;
  alias: string;
  tag: string;
  component: string | null;
  actions: string[];
  visibleText: string;
  bbox: [number, number, number, number];
}

export interface ActionManifestEntry {
  ref: string;
  nid: number;
  alias: string;
  tag: string;
  component: string | null;
  axName: string;
  bbox: [number, number, number, number];
  locator: {
    strategy: 'testId' | 'id' | 'css';
    value: string;
  };
  inViewport: boolean;
}

export interface ActionManifest {
  byAction: {
    clickable: ActionManifestEntry[];
    fillable: ActionManifestEntry[];
    navigable: ActionManifestEntry[];
  };
  viewportRefs: string[];
}

export interface ViewGraphAnnotation {
  id: string;
  uuid: string;
  type: 'element' | 'region' | 'page';
  selector: string;
  comment: string;
  severity: '' | 'critical' | 'major' | 'minor';
  category: '' | 'visual' | 'functional' | 'a11y' | 'content' | 'perf';
  region: { x: number; y: number; width: number; height: number };
  timestamp: string;
}

export interface ViewGraphCapture {
  metadata: ViewGraphMetadata;
  summary: Record<string, unknown>;
  nodes: { high: Record<string, ViewGraphNode>; med: Record<string, ViewGraphNode>; low: Record<string, ViewGraphNode> };
  actionManifest: ActionManifest;
  details: Record<string, unknown>;
  relations: Record<string, unknown>;
  annotations?: ViewGraphAnnotation[];
}

// ── API Types ──

export interface ViewGraphPageOptions {
  /** Output directory for capture files. Defaults to .viewgraph/captures/ */
  capturesDir?: string;
}

export interface AnnotateOptions {
  /** Severity: critical, major, minor */
  severity?: 'critical' | 'major' | 'minor';
  /** Category: visual, functional, a11y, content, perf */
  category?: 'visual' | 'functional' | 'a11y' | 'content' | 'perf';
}

export interface ViewGraphPage {
  /**
   * Capture the current page state as ViewGraph JSON.
   * @param label - Human-readable label for the capture
   */
  capture(label?: string): Promise<ViewGraphCapture>;

  /**
   * Capture an HTML snapshot of the current page.
   */
  snapshot(): Promise<string>;

  /**
   * Add a programmatic annotation to the next capture.
   * @param selector - CSS selector of the element
   * @param comment - Annotation comment
   * @param options - Severity and category
   */
  annotate(selector: string, comment: string, options?: AnnotateOptions): Promise<ViewGraphAnnotation>;

  /**
   * Capture with annotations attached.
   * Combines capture() + any annotations added via annotate().
   * @param label - Human-readable label
   */
  captureWithAnnotations(label?: string): Promise<ViewGraphCapture>;
}

/**
 * Create a ViewGraph instance for a Playwright page.
 * Injects the capture bundle on first use and provides methods to
 * capture DOM state, take HTML snapshots, and add annotations.
 */
export declare function createViewGraph(page: Page, options?: ViewGraphPageOptions): Promise<ViewGraphPage>;
