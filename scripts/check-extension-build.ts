import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import vm from 'node:vm'

import { getManifest } from '../src/manifest'

const targets = process.argv.slice(2)
const browsers = targets.length ? targets : ['chrome', 'firefox']
const sorted = (values: unknown[] = []) => [...values].sort()

async function checkExtensionBuild() {
  for (const target of browsers) {
    const noChineseFonts = target.endsWith('-no-chinese-fonts')
    const browser = target.replace(/-no-chinese-fonts$/, '')
    const root = resolve(`.output/${browser}-mv3${noChineseFonts ? '-no-chinese-fonts' : ''}`)
    const actual = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'))
    const expected = await getManifest({ browser, mode: 'production' })

    for (const key of ['manifest_version', 'name', 'version', 'description', 'homepage_url', 'content_security_policy', 'browser_specific_settings'] as const)
      assert.deepEqual(actual[key], expected[key], `${browser}: ${key}`)
    for (const key of ['permissions', 'host_permissions'] as const)
      assert.deepEqual(sorted(actual[key]), sorted(expected[key]), `${browser}: ${key}`)
    assert.equal(actual.action, undefined, 'Do not accidentally register the popup')
    assert.equal(actual.options_ui, undefined, 'Do not accidentally register options')
    assert.equal(actual.content_scripts.length, expected.content_scripts!.length)

    const referencedFiles: string[] = Object.values(actual.icons)
    for (const entry of expected.content_scripts!) {
      const expectedWorld = (entry as typeof entry & { world?: string }).world || 'ISOLATED'
      const content = actual.content_scripts.find((item: { world?: string }) => (item.world || 'ISOLATED') === expectedWorld)
      assert.ok(content, `${browser}: content script world`)
      assert.deepEqual(sorted(content.matches), sorted(entry.matches), `${browser}: content matches`)
      assert.equal(content.run_at, entry.run_at)
      assert.equal(Boolean(content.all_frames), Boolean(entry.all_frames))
      assert.equal(Boolean(content.match_about_blank), Boolean(entry.match_about_blank))
      referencedFiles.push(...content.js, ...(content.css || []))
    }
    if (browser === 'chrome') {
      assert.ok(actual.background.service_worker)
      referencedFiles.push(actual.background.service_worker)
    }
    else {
      assert.ok(actual.background.scripts?.length)
      const expectedPersistent = expected.background && 'persistent' in expected.background ? expected.background.persistent : undefined
      assert.equal(actual.background.persistent, expectedPersistent)
      referencedFiles.push(...actual.background.scripts)
    }
    assert.deepEqual(actual.declarative_net_request, expected.declarative_net_request)
    referencedFiles.push(...(actual.declarative_net_request?.rule_resources || []).map((rule: { path: string }) => rule.path))
    const shadowCss = 'content-scripts/bewly.css'
    const css = readFileSync(resolve(root, shadowCss), 'utf8')
    // Layout CSS can build successfully even when the icon loader is disabled.
    for (const icon of ['settings-3-line', 'i-ic-baseline-clear', 'i-tabler'])
      assert.ok(css.includes(icon), `${browser}: missing button icon CSS: ${icon}`)
    assert.ok(css.includes('data:image/svg+xml'), `${browser}: missing embedded icon SVGs`)
    assert.ok(actual.web_accessible_resources.some((entry: { resources: string[] }) => entry.resources.includes(shadowCss)))
    referencedFiles.push(shadowCss, 'assets/fonts/Geist[wght].woff2', 'assets/fonts/Onest[wght].woff2')
    for (const file of referencedFiles)
      assert.ok(existsSync(resolve(root, file)), `${browser}: missing ${file}`)

    const contentScripts = actual.content_scripts.flatMap((entry: { js: string[] }) => entry.js)
      .map((file: string) => readFileSync(resolve(root, file), 'utf8')).join('\n')
    for (const font of ['ShangguSansSC-VF.ttf', 'ZhudouSansVF-subset.woff2']) {
      assert.equal(existsSync(resolve(root, 'assets/fonts', font)), !noChineseFonts, `${target}: font asset ${font}`)
      assert.equal(contentScripts.includes(font), !noChineseFonts, `${target}: font URL ${font}`)
    }

    // Execute the actual bundled MAIN-world script, then exercise SPA navigation.
    const events: unknown[] = []
    const window = {
      history: { pushState: () => 'original-return', replaceState: () => {}, forward: () => {} },
      dispatchEvent: (event: unknown) => events.push(event),
      ___inject: false,
    }
    const context = vm.createContext({
      window,
      console,
      CustomEvent: class { constructor(public type: string, public options: unknown) {} },
    })
    const mainScript = actual.content_scripts.find((entry: { world?: string }) => entry.world === 'MAIN').js[0]
    vm.runInContext(readFileSync(resolve(root, mainScript), 'utf8'), context)
    // Entrypoint initialization may use a bundled Promise when importing the legacy script.
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(window.___inject, true)
    assert.equal(window.history.pushState(), 'original-return')
    assert.equal((events[0] as { type: string }).type, 'historyChange')
    console.log(`${target}: manifest parity, resources, font variant, and bundled history hook passed`)
  }
}

checkExtensionBuild().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
