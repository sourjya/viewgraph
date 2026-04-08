/**
 * WXT Configuration  -  ViewGraph Capture Extension
 *
 * Configures the WXT build pipeline for cross-browser extension development.
 * Primary target is Firefox MV3, with Chrome as the dev environment
 * (Firefox lacks localhost access for hot-reload).
 */

import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'ViewGraph Capture',
    description: 'Capture DOM structure, screenshots, and annotations for AI-powered UI analysis',
    permissions: ['activeTab', 'storage', 'scripting'],
    optional_permissions: ['tabs'],
    host_permissions: ['<all_urls>'],
  },
});
