import { createRequire } from 'node:module'

import { presetAttributify, presetIcons, presetTypography, presetUno, transformerDirectives } from 'unocss'
import { defineConfig } from 'unocss/vite'

const remRE = /(-?[.\d]+)rem/g
const loadIconJson = createRequire(import.meta.url)
// Explicit local loaders also work when the build inherits VSCODE_CWD.
// UnoCSS otherwise disables its automatic Node loader in an editor environment.
const iconCollections = Object.fromEntries(
  Object.keys(loadIconJson('@iconify/json/collections.json')).map(name => [
    name,
    () => loadIconJson(`@iconify/json/json/${name}.json`),
  ]),
)

export default defineConfig({
  content: {
    pipeline: {
      exclude: [/node_modules/, /\.wxt[\\/]/, /\.output[\\/]/, /\.migration-backups[\\/]/],
      include: [
        '**/*.{js,ts}',
        /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/,
      ],
    },
  },
  blocklist: [
    'ps',
    'container',
  ],
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      collections: iconCollections,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
        'width': '1.2em',
        'height': '1.2em',
      },
    }),
    presetTypography(),

    {
      name: 'text-size-transformer',
      postprocess: (util) => {
        util.entries.forEach((i) => {
          const value = i[1]

          if (typeof value === 'string' && remRE.test(value)) {
            i[1] = value.replace(remRE, (_, num: number) => {
              return `calc(var(--bew-base-font-size) * ${num})`
            })
          }
        })
      },
    },
  ],
  transformers: [
    transformerDirectives(),
  ],
})
