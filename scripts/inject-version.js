#!/usr/bin/env node
/**
 * 將 package.json 的 version 注入到 docs/index.html 與 docs/sw.js 的 {{APP_VERSION}}
 * 本地 npm run build 與 GitHub Actions 部署時版號一致
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = pkg.version || '0.0.0'
const placeholder = '{{APP_VERSION}}'

const files = [
  join(root, 'docs', 'index.html'),
  join(root, 'docs', 'sw.js')
]

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf8')
    if (content.includes(placeholder)) {
      content = content.replaceAll(placeholder, version)
      writeFileSync(file, content)
      console.log(`[inject-version] ${file}: {{APP_VERSION}} → ${version}`)
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.warn(`[inject-version] 略過（建置後才有）: ${file}`)
    } else {
      throw e
    }
  }
}
