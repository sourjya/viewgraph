# @viewgraph/vitest

ViewGraph DOM capture plugin for Vitest. Capture structured DOM snapshots during component and unit tests.

## Install

```bash
npm install --save-dev @viewgraph/vitest
```

Requires `vitest` and `jsdom` as peer dependencies.

## Usage

```typescript
import { captureDOM, captureAndAssert } from '@viewgraph/vitest';
import { render } from '@testing-library/react';

test('login form has all required fields', () => {
  render(<LoginForm />);

  const capture = captureDOM('login-form');

  // Check interactive elements
  expect(capture.actionManifest.byAction.fillable.length).toBeGreaterThan(0);
  expect(capture.metadata.stats.interactive).toBeGreaterThan(2);
});

test('registration form passes a11y checks', () => {
  render(<RegistrationForm />);

  // One-call capture + assertions
  captureAndAssert('registration', {
    minInteractive: 3,
    noMissingLabels: true,
    noMissingTestids: true,
  });
});
```

## API

### `captureDOM(label?, options?)`

Captures the current jsdom DOM state. Returns a ViewGraph-compatible capture object.

- `label` - Human-readable label for the capture
- `options.capturesDir` - Output directory (default: `.viewgraph/captures/`)
- `options.write` - Write to disk (default: `true`)

### `captureAndAssert(label, expectations?, options?)`

Captures DOM and runs assertions in one call. Throws if any expectation fails.

- `expectations.minNodes` - Minimum total DOM nodes
- `expectations.minInteractive` - Minimum interactive elements
- `expectations.noMissingLabels` - Assert all interactive elements have ARIA labels
- `expectations.noMissingTestids` - Assert all interactive elements have `data-testid`

## Output Format

Produces the same ViewGraph v2 capture format as the browser extension and `@viewgraph/playwright`. Captures can be read by the ViewGraph MCP server's 41 analysis tools.

## License

AGPL-3.0
