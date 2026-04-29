/**
 * WXT Configuration  -  ViewGraph Capture Extension
 *
 * Configures the WXT build pipeline for cross-browser extension development.
 * Primary target is Firefox MV3, with Chrome as the dev environment
 * (Firefox lacks localhost access for hot-reload).
 */

import { defineConfig } from 'wxt';

export default defineConfig({
  // Exclude axe-core from bundle - loaded lazily from public/axe.min.js
  vite: () => ({
    build: {
      rollupOptions: {
        external: ['axe-core'],
      },
    },
  }),
  manifest: {
    name: 'ViewGraph Capture',
    description: 'Capture DOM structure, screenshots, and annotations for AI-powered UI analysis',
    permissions: ['activeTab', 'storage', 'scripting', 'alarms'],
    optional_permissions: ['tabs'],
    host_permissions: ['<all_urls>'],
    icons: {
      16: 'icon-16.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    action: {
      default_icon: {
        16: 'icon-16.png',
        48: 'icon-48.png',
        128: 'icon-128.png',
      },
    },
    commands: {
      'panic-capture': {
        suggested_key: { default: 'Ctrl+Shift+V', mac: 'Command+Shift+V' },
        description: 'Instant snapshot - capture DOM + screenshot mid-action',
      },
    },
    web_accessible_resources: [
      { resources: ['icon-16.png', 'icon-48.png'], matches: ['<all_urls>'] },
    ],
    // Firefox requires an explicit add-on ID for MV3
    browser_specific_settings: {
      gecko: {
        id: 'viewgraph@chaoslabz.com',
        strict_min_version: '115.0',
      },
    },
  },
});
