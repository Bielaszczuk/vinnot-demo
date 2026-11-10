import { test, expect } from './fixtures'
import { createServer } from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publishWebRelease } from '../../../scripts/publish-web-release.mjs'

test('an open tab loads its old lazy chunk after publication and rollback restores the exact entrypoint', async ({ page }) => {
  const root = mkdtempSync(join(tmpdir(), 'vinnot-browser-release-'))
  const bucket = join(root, 'bucket')
  mkdirSync(bucket)
  const packages = ['a', 'b'].map(name => {
    const dir = join(root, name)
    mkdirSync(join(dir, 'assets'), { recursive: true })
    writeFileSync(join(dir, 'index.html'), `<h1>${name}</h1><button>Navigate</button><output></output><script type="module">document.querySelector('button').onclick=async()=>{const m=await import('/assets/${name}.js');document.querySelector('output').textContent=m.default}</script>`)
    writeFileSync(join(dir, 'assets', `${name}.js`), `export default '${name} lazy route'`)
    return dir
  })
  // Filesystem-backed object store: exercise real publication order and browser module loading.
  const aws = (args: string[]) => {
    const arg = (index: number) => {
      const value = args[index]
      if (value === undefined) throw new Error('Missing object-store argument')
      return value
    }
    const local = (uri: string) => join(bucket, uri.replace(/^s3:\/\/[^/]+\/?/, ''))
    if (args[0] === 's3' && args[1] === 'sync') {
      const excluded = args.flatMap((value, i) => value === '--exclude' ? [args[i + 1]] : [])
      mkdirSync(local(arg(3)), { recursive: true })
      for (const entry of readdirSync(arg(2))) {
        if (excluded.includes(entry) || excluded.includes(`${entry}/*`)) continue
        cpSync(join(arg(2), entry), join(local(arg(3)), entry), { recursive: true })
      }
    } else if (args[0] === 's3' && args[1] === 'cp') {
      if (arg(3) === '-') return readFileSync(local(arg(2)), 'utf8')
      cpSync(arg(2), local(arg(3)))
    } else if (args[1] === 'create-invalidation') return JSON.stringify({ Invalidation: { Id: 'local' } })
    return ''
  }
  const server = createServer((request, response) => {
    try {
      const file = new URL(request.url ?? '/', 'http://localhost').pathname
      response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/html')
      response.setHeader('Cache-Control', 'no-store')
      response.end(readFileSync(join(bucket, file === '/' ? 'index.html' : file)))
    } catch { response.writeHead(404).end() }
  })
  try {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing test server')
    const publish = (index: number) => publishWebRelease({ directory: packages[index], revision: (index ? 'b' : 'a').repeat(40), environment: 'production', aws })
    publish(0)
    await page.goto(`http://127.0.0.1:${address.port}`)
    await expect(page.getByRole('heading')).toHaveText('a')
    publish(1)
    await page.getByRole('button').click()
    await expect(page.locator('output')).toHaveText('a lazy route')
    await page.reload()
    await expect(page.getByRole('heading')).toHaveText('b')
    publish(0)
    await page.reload()
    await expect(page.getByRole('heading')).toHaveText('a')
    expect(readFileSync(join(bucket, 'index.html'), 'utf8')).toBe(readFileSync(join(packages[0]!, 'index.html'), 'utf8'))
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
    rmSync(root, { recursive: true, force: true })
  }
})
