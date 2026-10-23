import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createPrivateKey, generateKeyPairSync } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import ChromeExtension from 'crx'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Keep the key outside WXT output: cleaning/rebuilding must never change the ID.
const keyPath = resolve(root, process.env.CRX_PRIVATE_KEY || 'chrome.pem')

async function getPrivateKey() {
  try {
    return await readFile(keyPath)
  }
  catch (error) {
    if (error.code !== 'ENOENT' || process.env.CRX_PRIVATE_KEY)
      throw error
  }

  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  await mkdir(dirname(keyPath), { recursive: true })
  try {
    await writeFile(keyPath, privateKey, { flag: 'wx', mode: 0o600 })
  }
  catch (error) {
    // Another invocation may have created it; never overwrite an existing key.
    if (error.code !== 'EEXIST')
      throw error
  }
  return readFile(keyPath)
}

async function run(packageName, args, env) {
  const packageDir = resolve(root, 'node_modules', packageName)
  const meta = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8'))
  const executable = typeof meta.bin === 'string' ? meta.bin : meta.bin[packageName]
  const result = spawnSync(process.execPath, [resolve(packageDir, executable), ...args], {
    cwd: root,
    env,
    stdio: 'inherit',
  })
  if (result.error)
    throw result.error
  if (result.status !== 0)
    throw new Error(`${packageName} failed (${result.signal || result.status})`)
}

async function main() {
  const privateKey = await getPrivateKey()
  assert.equal(createPrivateKey(privateKey).asymmetricKeyType, 'rsa', 'CRX signing requires an RSA private key')
  const artifacts = []
  let extensionId

  for (const noChineseFonts of [false, true]) {
    const suffix = noChineseFonts ? '-no-chinese-fonts' : ''
    const env = { ...process.env, BEWLY_NO_CHINESE_FONTS: noChineseFonts ? '1' : '0' }
    console.log(`\nBuilding ${noChineseFonts ? 'without Chinese fonts' : 'with all fonts'}...`)
    await run('wxt', ['zip', '-b', 'chrome', '--mv3'], env)
    await run('esno', ['scripts/check-extension-build.ts', `chrome${suffix}`], env)

    const zipPath = resolve(root, `.output/extension${suffix}.zip`)
    const crxPath = resolve(root, `.output/extension${suffix}.crx`)
    const zip = await readFile(zipPath)
    const extension = new ChromeExtension({ privateKey, version: 3 })
    await extension.load(resolve(root, `.output/chrome-mv3${suffix}`))
    // Sign the exact WXT ZIP so both distributed formats contain identical files.
    const crx = await extension.pack(zip)
    assert.equal(crx.toString('ascii', 0, 4), 'Cr24')
    assert.equal(crx.readUInt32LE(4), 3)
    assert.ok(crx.subarray(12 + crx.readUInt32LE(8)).equals(zip))
    const id = extension.generateAppId()
    if (extensionId)
      assert.equal(id, extensionId, 'Both variants must have the same extension ID')
    extensionId = id
    await writeFile(crxPath, crx)
    artifacts.push({ file: crxPath, size: crx.length }, { file: zipPath, size: zip.length })
  }

  console.log(`\nExtension ID: ${extensionId}`)
  console.log(`Keep this private key for future updates (do not distribute): ${keyPath}`)
  for (const { file, size } of artifacts)
    console.log(`${file} (${(size / 1024 / 1024).toFixed(2)} MiB)`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
