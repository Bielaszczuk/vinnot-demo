// Remark plugin: the canonical docs link to source files (../../backend/...) and to the other
// language mirror (../en/README.md). Those targets are not site pages, so Docusaurus would
// report them as broken. This rewrites them:
// - a file or folder in the repository -> its GitHub URL;
// - a page of the other language mirror -> its route in the site.
// Links between pages of the same language are left for Docusaurus to resolve.
import { existsSync, statSync } from 'node:fs';
import { dirname, isAbsolute, posix, relative, resolve, sep } from 'node:path';

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

const isInside = (child, parent) => {
  const rel = relative(parent, child);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};

const toPosix = path => path.split(sep).join(posix.sep);

/** Route of a doc relative to its language root, matching Docusaurus defaults. */
export function docRoute(relativePath) {
  const withoutExtension = toPosix(relativePath).replace(/\.mdx?$/i, '');
  const segments = withoutExtension.split('/');
  const last = segments.at(-1);
  if (/^(readme|index)$/i.test(last)) {
    segments.pop();
  }
  return segments.join('/');
}

/**
 * @param {object} options
 * @param {string} options.repoRoot absolute repository root
 * @param {string} options.repoUrl e.g. https://github.com/owner/repo
 * @param {string} options.branch branch used for source links
 * @param {string} options.routeBasePath docs route base, e.g. "docs"
 * @param {string} options.baseUrl site base URL, e.g. "/"
 * @param {Array<{locale: string, docsDir: string, sourceDir?: string, prefix: string}>} options.locales
 *   docsDir is the canonical folder; sourceDir is where Docusaurus reads it from when it differs.
 */
export function resolveLink(url, filePath, options) {
  if (!url || url.startsWith('#') || url.startsWith('/') || SCHEME.test(url)) {
    return url;
  }
  const origin = options.locales.find(({ docsDir, sourceDir }) => isInside(filePath, sourceDir ?? docsDir));
  if (!origin) {
    return url;
  }
  const canonicalFile = resolve(origin.docsDir, relative(origin.sourceDir ?? origin.docsDir, filePath));
  const hashIndex = url.indexOf('#');
  const path = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
  const target = resolve(dirname(canonicalFile), decodeURI(path));
  if (isInside(target, origin.docsDir)) {
    return url;
  }
  const mirror = options.locales.find(({ docsDir }) => isInside(target, docsDir));
  if (mirror && /\.mdx?$/i.test(target)) {
    // Each locale is built as a separate app, so a link to another locale is a plain
    // page load (pathname://) that Docusaurus neither prefixes nor checks.
    const route = docRoute(relative(mirror.docsDir, target));
    const base = `${options.baseUrl.replace(/\/$/, '')}${mirror.prefix}/${options.routeBasePath}`;
    return `pathname://${route ? `${base}/${route}` : `${base}/`}${hash}`;
  }
  if (!isInside(target, options.repoRoot) || !existsSync(target)) {
    return url;
  }
  const kind = statSync(target).isDirectory() ? 'tree' : 'blob';
  const repoPath = toPosix(relative(options.repoRoot, target));
  return `${options.repoUrl}/${kind}/${options.branch}/${encodeURI(repoPath)}${hash}`;
}

function visit(node, callback) {
  callback(node);
  for (const child of node.children ?? []) {
    visit(child, callback);
  }
}

export default function repoLinks(options) {
  return (tree, file) => {
    const filePath = file.path ?? file.history?.at(-1);
    if (!filePath) {
      return;
    }
    visit(tree, node => {
      if ((node.type === 'link' || node.type === 'definition') && typeof node.url === 'string') {
        node.url = resolveLink(node.url, filePath, options);
      }
    });
  };
}
