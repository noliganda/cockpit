/**
 * Probe P4.7 — the REAL task dialog offers each operator exactly once with
 * agent typing (R2 UI half).
 *
 * Drives the rendered dashboard in headless system Chrome (playwright-core —
 * no bundled browsers) with a crafted local admin session cookie (ops-session
 * is plain JSON; local server only):
 *  1. /tasks → open the New Task dialog.
 *  2. The assignee <select> contains EXACTLY ONE option per registry operator
 *     id (regression: VIRTUAL_HARNESSES used to add function-typed hermes /
 *     claude-code duplicates).
 *  3. Selecting Hermes shows the "Autonomous Agent Operator" typing hint —
 *     i.e. the dialog will submit assigneeType 'agent'.
 * SKIPs (exit 0, loud note) when system Chrome is absent.
 */
import { existsSync } from 'node:fs'
import { check, finish } from './_probe-env'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

async function main() {
  if (!existsSync(CHROME)) {
    console.log('SKIP  system Chrome not found — dialog UI probe not run on this machine')
    finish('probe P4.7 dialog UI (skipped)')
  }
  const { chromium } = await import('playwright-core')
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    await context.addCookies([{
      name: 'ops-session',
      value: encodeURIComponent(JSON.stringify({ userId: 'probe', email: 'probe@local', role: 'admin' })),
      domain: 'localhost',
      path: '/',
    }])
    const page = await context.newPage()
    await page.goto(`${BASE}/tasks`, { waitUntil: 'networkidle' })

    // Open the creation dialog (the page's New Task affordance).
    const newTask = page.getByRole('button', { name: /new task|add task/i }).first()
    await newTask.click()
    const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'Unassigned' }) }).first()
    await select.waitFor({ state: 'visible', timeout: 10_000 })

    const optionValues: string[] = await select.locator('option').evaluateAll(
      opts => opts.map(o => (o as HTMLOptionElement).value).filter(Boolean),
    )
    const counts = new Map<string, number>()
    for (const v of optionValues) counts.set(v, (counts.get(v) ?? 0) + 1)
    const dupes = [...counts.entries()].filter(([, n]) => n > 1)
    check('no duplicate operator entries in assignee dropdown', dupes.length === 0, JSON.stringify(dupes))
    check('hermes present exactly once', counts.get('hermes') === 1, String(counts.get('hermes')))
    check('claude-code present exactly once', counts.get('claude-code') === 1, String(counts.get('claude-code')))

    await select.selectOption('hermes')
    const hint = page.getByText('Autonomous Agent Operator')
    check('selecting Hermes shows the agent-operator typing hint', await hint.isVisible(), 'hint visible = dialog submits assigneeType agent')
  } finally {
    await browser.close()
  }
  finish('probe P4.7 dialog UI')
}

main().catch((err) => { console.error(err); process.exit(1) })
