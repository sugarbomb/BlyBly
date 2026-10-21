import { spawnSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const baseline = JSON.parse(readFileSync(new URL('./typecheck-baseline.json', import.meta.url), 'utf8'))
const result = spawnSync(process.execPath, [resolve('node_modules/vue-tsc/bin/vue-tsc.js'), '--noEmit', '--pretty', 'false', '--locale', 'en'], { encoding: 'utf8' })
if (result.error)
  throw result.error
const output = `${result.stdout || ''}${result.stderr || ''}`.replace(/\r/g, '').trim()
const headers = [...output.matchAll(/^(.+?)\(\d+,\d+\): error (TS\d+): /gm)]
const diagnostics = headers.map((match, index) => ({
  file: match[1].replaceAll('\\', '/'),
  code: match[2],
  message: output.slice(match.index + match[0].length, headers[index + 1]?.index ?? output.length).trim(),
}))
const remaining = [...baseline]
const unexpected = diagnostics.filter((diagnostic) => {
  const index = remaining.findIndex(item => item.file === diagnostic.file && item.code === diagnostic.code && item.message === diagnostic.message)
  if (index < 0)
    return true
  remaining.splice(index, 1)
  return false
})

if (unexpected.length || result.signal || (result.status !== 0 && !diagnostics.length)) {
  console.error(output)
  console.error('Typecheck failed: new diagnostics or compiler failure.')
  process.exit(1)
}
for (const diagnostic of diagnostics) {
  const message = `Known typecheck baseline: ${diagnostic.file} ${diagnostic.code}`
  if (process.env.GITHUB_ACTIONS === 'true')
    console.warn(`::warning file=${diagnostic.file},title=Known type error::${message}`)
  else
    console.warn(message)
}
console.log(`Typecheck: no new errors; ${diagnostics.length} known baseline errors remain. The strict typecheck command is unchanged.`)
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Typecheck baseline\n\n${diagnostics.length} known errors remain; no new errors.\n\n${diagnostics.map(item => `- ${item.file}: ${item.code}`).join('\n')}\n\nRun \`pnpm run typecheck\` for the strict check.\n`)
}
