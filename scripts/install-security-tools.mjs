import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

// Reviewed release assets; never execute a downloaded installer or a mutable action tag.
export const securityTools = [
  {
    name: 'actionlint', repository: 'rhysd/actionlint', version: '1.7.12',
    assets: {
      'linux-x64': ['actionlint_1.7.12_linux_amd64.tar.gz', '8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8'],
      'darwin-arm64': ['actionlint_1.7.12_darwin_arm64.tar.gz', 'aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f'],
      'darwin-x64': ['actionlint_1.7.12_darwin_amd64.tar.gz', '5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644'],
    },
  },
  {
    name: 'trivy', repository: 'aquasecurity/trivy', version: '0.74.0',
    assets: {
      'linux-x64': ['trivy_0.74.0_Linux-64bit.tar.gz', '2ae6fe3ee734b7fdf11335663e18c75ea12dccc76062f09f164a3b0f8be4371a'],
      'darwin-arm64': ['trivy_0.74.0_macOS-ARM64.tar.gz', '1caada5e0e2091909357c7525d3aa76f4b660b13821bc143b190c7483e31cc11'],
      'darwin-x64': ['trivy_0.74.0_macOS-64bit.tar.gz', '472816f6888dda689d075c30254d4210b4d1035acf365aa72332f584c2f60485'],
    },
  },
  {
    name: 'gitleaks', repository: 'gitleaks/gitleaks', version: '8.28.0',
    assets: {
      'linux-x64': ['gitleaks_8.28.0_linux_x64.tar.gz', 'a65b5253807a68ac0cafa4414031fd740aeb55f54fb7e55f386acb52e6a840eb'],
      'darwin-arm64': ['gitleaks_8.28.0_darwin_arm64.tar.gz', 'd942f3ad147250c9edbaab3fed9e482f98d3b59ba10ae97b8d75647e3ade492c'],
      'darwin-x64': ['gitleaks_8.28.0_darwin_x64.tar.gz', 'edf5a507008b0d2ef4959575772772770586409c1f6f74dabf19cbe7ec341ced'],
    },
  },
]

export function verifyArchive(bytes, expectedHash) {
  if (!/^[a-f0-9]{64}$/.test(expectedHash)
      || createHash('sha256').update(bytes).digest('hex') !== expectedHash) {
    throw new Error('Security tool archive checksum mismatch; installation refused')
  }
}

export function toolAsset(tool, platform) {
  const asset = tool.assets[platform]
  if (!asset) throw new Error(`Unsupported security tool platform: ${platform}`)
  return asset
}

export function selectTools(names) {
  if (!names.length || names.some(name => !securityTools.some(tool => tool.name === name))) {
    throw new Error('Select at least one known security tool');
  }
  return securityTools.filter(tool => names.includes(tool.name));
}

export async function installSecurityTools(destination, platform = `${process.platform}-${process.arch}`, names = ['trivy', 'gitleaks']) {
  const selected = selectTools(names);
  const target = resolve(destination)
  const staging = mkdtempSync(join(tmpdir(), 'vinnot-security-tools-'))
  mkdirSync(target, { recursive: true })
  try {
    for (const tool of selected) {
      const [filename, checksum] = toolAsset(tool, platform)
      const response = await fetch(`https://github.com/${tool.repository}/releases/download/v${tool.version}/${filename}`, {
        signal: AbortSignal.timeout(180_000),
      })
      if (!response.ok) throw new Error(`${tool.name} download failed: HTTP ${response.status}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      verifyArchive(bytes, checksum)
      const archive = join(staging, filename)
      writeFileSync(archive, bytes, { mode: 0o600 })
      // Extract only the verified executable, not arbitrary archive paths.
      execFileSync('tar', ['-xzf', archive, '-C', target, tool.name])
      console.log(`Installed ${tool.name} ${tool.version} (SHA-256 verified)`)
    }
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/install-security-tools.mjs <bin-directory>')
  await installSecurityTools(process.argv[2], undefined, process.argv.length > 3 ? process.argv.slice(3) : undefined)
}
