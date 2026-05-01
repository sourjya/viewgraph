/**
 * @viewgraph/vitest - TypeScript Type Definitions
 */

export interface CaptureMetadata {
  format: 'viewgraph-v2';
  version: string;
  url: string;
  title: string;
  timestamp: string;
  captureMode: 'vitest';
  label: string | null;
  stats: { totalNodes: number; interactive: number };
}

export interface CaptureNode {
  nid: number;
  tag: string;
  role: string | null;
  text: string;
}

export interface InteractiveNode extends CaptureNode {
  testid: string | null;
  ariaLabel: string | null;
  isInteractive: true;
}

export interface ActionManifest {
  byAction: {
    clickable: InteractiveNode[];
    fillable: InteractiveNode[];
    navigable: InteractiveNode[];
  };
}

export interface VitestCapture {
  metadata: CaptureMetadata;
  nodes: CaptureNode[];
  actionManifest: ActionManifest;
  accessibility: {
    missingLabels: InteractiveNode[];
    missingTestids: InteractiveNode[];
  };
  _filename?: string;
}

export interface CaptureOptions {
  capturesDir?: string;
  write?: boolean;
}

export interface CaptureExpectations {
  minNodes?: number;
  minInteractive?: number;
  noMissingLabels?: boolean;
  noMissingTestids?: boolean;
}

/**
 * Capture the current jsdom DOM state as a ViewGraph-compatible snapshot.
 */
export declare function captureDOM(label?: string, options?: CaptureOptions): VitestCapture;

/**
 * Capture DOM and run common assertions in one call.
 */
export declare function captureAndAssert(label: string, expectations?: CaptureExpectations, options?: CaptureOptions): VitestCapture;
