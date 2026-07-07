import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3100'
const OUT = '/tmp/om-refresh-shots'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, headless: true })

const routes = [
  ['/', 'home'],
  ['/tasks', 'tasks'],
  ['/dispatch', 'dispatch'],
  ['/messages', 'messages'],
  ['/metrics', 'metrics'],
  ['/login', 'login'],
]

for (const [name, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 })
  await context.addCookies([{
    name: 'ops-session',
    value: encodeURIComponent(JSON.stringify({ userId: 'probe', email: 'probe@local', role: 'admin' })),
    domain: 'localhost', path: '/',
  }])
  const page = await context.newPage()
  const list = name === 'desktop' ? routes : routes.slice(0, 2)
  for (const [route, label] of list) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => console.log(`${label}: ${e.message}`))
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: false })
    console.log(`${label}-${name} done`)
  }
  await context.close()
}
await browser.close()
console.log('all shots written to ' + OUT)
