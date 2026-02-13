#!/usr/bin/env node
/**
 * 從 GitHub Pages 下載 data/*.json 到本機 data/ 與 public/data/
 * 使用：node scripts/pull-data-from-github.js  或  npm run pull-data
 */
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://greedysisyphus.github.io/Brainless/data'
const DAYS_TO_TRY = 14
const DATA_DIR = path.join(__dirname, '..', 'data')
const PUBLIC_DATA_DIR = path.join(__dirname, '..', 'public', 'data')

function getDateStr(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        resolve(null)
        return
      }
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          const data = JSON.parse(body)
          resolve(data)
        } catch {
          resolve(null)
        }
      })
    }).on('error', reject)
  })
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true })
  console.log('從 GitHub Pages 下載航班 JSON...')
  console.log(`  URL: ${BASE_URL}/flight-data-YYYY-MM-DD.json`)
  console.log(`  本機: ${DATA_DIR}\n`)

  let count = 0
  for (let i = 0; i < DAYS_TO_TRY; i++) {
    const dateStr = getDateStr(i)
    const url = `${BASE_URL}/flight-data-${dateStr}.json`
    const data = await fetchJson(url)
    if (data && data.date && Array.isArray(data.flights)) {
      const filename = `flight-data-${dateStr}.json`
      const json = JSON.stringify(data, null, 2)
      fs.writeFileSync(path.join(DATA_DIR, filename), json, 'utf8')
      fs.writeFileSync(path.join(PUBLIC_DATA_DIR, filename), json, 'utf8')
      console.log(`  ✅ ${dateStr} (${data.flights.length} 班)`)
      count++
    }
  }

  console.log(`\n完成：共 ${count} 個檔案已寫入 data/ 與 public/data/`)
  if (count === 0) {
    console.log('  若 GitHub Pages 尚未部署 data，請先部署或手動將 data/*.json 放入專案。')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
