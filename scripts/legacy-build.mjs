import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const browser = process.argv[2] || 'chrome'
const directories = { chrome: 'extension', firefox: 'extension-firefox' }
if (!Object.hasOwn(directories, browser))
  throw new Error('Legacy build supports chrome or firefox')

const output = resolve(root, directories[browser])
if (!output.startsWith(`${root}${sep}`) || dirname(output) !== root)
  throw new Error('Legacy output must be a direct child of this workspace')
// Only remove this build's output, never backup directories or ZIP archives.
rmSync(output, { recursive: true, force: true })

const env = { ...process.env, NODE_ENV: 'production', FIREFOX: String(browser === 'firefox'), SAFARI: 'false' }
function run(packageName, args) {
  const packageDir = resolve(root, 'node_modules', packageName)
  const meta = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'))
  const executable = typeof meta.bin === 'string' ? meta.bin : meta.bin[packageName]
  const result = spawnSync(process.execPath, [resolve(packageDir, executable), ...args], { cwd: root, env, stdio: 'inherit' })
  if (result.error)
    throw result.error
  if (result.status !== 0)
    process.exit(result.status || 1)
}

run('vite', ['build'])
run('esno', ['scripts/prepare.ts'])
run('vite', ['build', '--config', 'vite.config.content.ts'])
run('tsup', [])
