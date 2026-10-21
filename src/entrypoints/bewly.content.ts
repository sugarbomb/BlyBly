import { defineContentScript } from 'wxt/utils/define-content-script'

import { contentMatches } from '../extension-matches'

export default defineContentScript({
  matches: contentMatches,
  runAt: 'document_start',
  allFrames: true,
  matchAboutBlank: true,
  cssInjectionMode: 'manifest',
  main() {
    // Keep browser-only imports and their initialization out of the Node loader.
    // WXT bundles content scripts as a self-contained IIFE.
    return import('../contentScripts/index').then(() => {})
  },
})
