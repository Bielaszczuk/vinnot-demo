import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';
import repoLinks from './src/remark/repo-links.mjs';
import tableScroll from './src/rehype/table-scroll.mjs';
import chapterLabels from './src/sidebar/chapter-labels.mjs';

const siteDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(siteDir, '..');
// The source repository is private, so source and edit links point at its public copy,
// which holds a snapshot of main (the branch the published site is built from).
const repoUrl = 'https://github.com/Bielaszczuk/vinnot-demo';
const sourceBranch = process.env.DOCS_SOURCE_BRANCH ?? 'main';
const routeBasePath = 'docs';
const baseUrl = process.env.DOCS_BASE_URL ?? '/';

const repoLinkOptions = {
  repoRoot,
  repoUrl,
  branch: sourceBranch,
  routeBasePath,
  baseUrl,
  locales: [
    { locale: 'es', docsDir: resolve(repoRoot, 'docs/es'), prefix: '' },
    {
      locale: 'en',
      docsDir: resolve(repoRoot, 'docs/en'),
      sourceDir: resolve(siteDir, 'i18n/en/docusaurus-plugin-content-docs/current'),
      prefix: '/en',
    },
  ],
};

const config: Config = {
  title: 'Vinnot Docs',
  tagline: 'Documentación técnica y funcional de Vinnot',
  favicon: 'img/favicon.png',
  // The public host is decided with the deployment; local builds default to localhost.
  url: process.env.DOCS_SITE_URL ?? 'http://localhost:3000',
  baseUrl,
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',

  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    localeConfigs: {
      es: { label: 'Español', htmlLang: 'es-AR' },
      en: { label: 'English', htmlLang: 'en' },
    },
  },

  markdown: {
    // .md files are CommonMark like on GitHub; only .mdx files use MDX syntax.
    format: 'detect',
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs/es',
          routeBasePath,
          sidebarPath: './sidebars.ts',
          sidebarItemsGenerator: chapterLabels,
          editUrl: ({ locale, docPath }) => `${repoUrl}/edit/${sourceBranch}/docs/${locale}/${docPath}`,
          // Runs before Docusaurus resolves Markdown links, so source-code links never reach it.
          beforeDefaultRemarkPlugins: [[repoLinks, repoLinkOptions]],
          // Wide tables scroll inside the content column instead of spilling under the table of contents.
          rehypePlugins: [tableScroll],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['es', 'en'],
        docsRouteBasePath: routeBasePath,
        docsDir: '../docs/es',
        indexBlog: false,
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  themeConfig: {
    image: 'img/wordmark.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
    navbar: {
      logo: {
        alt: 'Vinnot',
        src: 'img/wordmark.png',
        className: 'vinnot-navbar-logo',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentación',
        },
        { type: 'localeDropdown', position: 'right' },
        {
          href: repoUrl,
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentación',
          items: [{ label: 'Inicio', to: `/${routeBasePath}` }],
        },
        {
          title: 'Repositorio',
          items: [
            { label: 'GitHub', href: repoUrl },
            { label: 'Issues', href: `${repoUrl}/issues` },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Vinnot`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['java', 'bash', 'json', 'yaml', 'sql', 'properties'],
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
