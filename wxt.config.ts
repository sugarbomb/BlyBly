import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import type { UserManifest } from 'wxt'
import { defineConfig } from 'wxt'

import { getManifest } from './src/manifest'

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  modules: ['@wxt-dev/module-vue'],
  // Keep the existing Vue/browser imports; avoid two competing import systems.
  imports: false,
  webExt: {
    disabled: process.env.WXT_NO_BROWSER === '1',
    startUrls: ['https://www.bilibili.com/'],
  },
  zip: {
    dotSources: true,
    includeSources: ['src/**', 'assets/**', 'scripts/**', '*.ts', '*.json', 'pnpm-lock.yaml', '.npmrc', '.gitignore', 'LICENSE', 'README.md', 'docs/WXT-MIGRATION.md'],
    excludeSources: ['.migration-backups/**', 'extension*/**', 'temp/**', 'web-ext-profile/**', 'package-lock.legacy.json'],
  },
  async manifest({ browser, mode }) {
    const manifest = await getManifest({ browser, mode })
    // WXT generates these from the entrypoint definitions.
    delete manifest.background
    delete manifest.content_scripts
    manifest.web_accessible_resources = [{
      resources: ['content-scripts/bewly.css', 'assets/*', 'assets/zone_v2_icon/*'],
      matches: ['<all_urls>'],
    }]
    // WXT adds its development CSP; production remains self-only.
    manifest.content_security_policy = { extension_pages: 'script-src \'self\'; object-src \'self\'' }
    return manifest as UserManifest
  },
  vite: ({ browser, mode }) => ({
    plugins: [
      AutoImport({
        imports: ['vue', { 'webextension-polyfill': [['*', 'browser']] }],
        dts: 'src/auto-imports.d.ts',
      }),
      VueI18nPlugin({
        runtimeOnly: true,
        compositionOnly: true,
        strictMessage: false,
        include: [resolve('src/_locales/**')],
      }),
      UnoCSS(),
    ],
    define: {
      '__DEV__': JSON.stringify(mode === 'development'),
      'process.env.FIREFOX': JSON.stringify(browser === 'firefox'),
      'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
      'import.meta.env.BEWLY_CONTENT_CSS': JSON.stringify('content-scripts/bewly.css'),
      '__VUE_OPTIONS_API__': 'true',
      '__VUE_PROD_DEVTOOLS__': 'false',
    },
    build: {
      cssCodeSplit: false,
      minify: 'terser',
      terserOptions: { mangle: false },
    },
  }),
  hooks: {
    'build:manifestGenerated': function (wxt, manifest) {
      // Preserve the existing Safari event-page background instead of WXT's MV3 worker default.
      if (wxt.config.browser === 'safari') {
        manifest.background = {
          scripts: ['background.js'],
          persistent: false,
        }
      }
    },
    'build:publicAssets': async function (_wxt, files) {
      // Keep assets/ as the single source of truth for both build pipelines.
      async function addAssets(dir: string) {
        for (const entry of await readdir(resolve(dir), { withFileTypes: true })) {
          const path = `${dir}/${entry.name}`
          if (entry.isDirectory())
            await addAssets(path)
          else
            files.push({ absoluteSrc: resolve(path), relativeDest: path })
        }
      }
      await addAssets('assets')
    },
  },
})
