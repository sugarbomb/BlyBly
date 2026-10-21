import { defineContentScript } from 'wxt/utils/define-content-script'

import { contentMatches } from '../extension-matches'

export default defineContentScript({
  matches: contentMatches,
  runAt: 'document_start',
  allFrames: true,
  world: 'MAIN',
  main() {
    return import('../inject/index.js').then(() => {})
  },
})
