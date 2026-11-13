import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// The public address of your site, used for link previews, robots.txt and the sitemap.
//   1. Set VITE_SITE_URL (for example https://warangalclubs.in) once you have a custom domain, or
//   2. do nothing on Vercel: it provides your address automatically while building.
function siteUrl(env) {
  const explicit = (env.VITE_SITE_URL || '').trim()
  if (explicit) return explicit.replace(/\/+$/, '')
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL
  return ''
}

function seoPlugin(site) {
  return {
    name: 'warangal-seo',
    // Adds the tags that must contain a full web address.
    transformIndexHtml() {
      if (!site) return []
      return [
        { tag: 'link', attrs: { rel: 'canonical', href: site + '/' }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:url', content: site + '/' }, injectTo: 'head' },
        { tag: 'meta', attrs: { property: 'og:image', content: site + '/og-image.png' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'twitter:image', content: site + '/og-image.png' }, injectTo: 'head' },
      ]
    },
    // Writes robots.txt and sitemap.xml into the build.
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', 'Disallow: /admin']
      if (site) robots.push('', `Sitemap: ${site}/sitemap.xml`)
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' })
      if (site) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source:
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            `  <url><loc>${site}/</loc><changefreq>daily</changefreq></url>\n` +
            '</urlset>\n',
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), seoPlugin(siteUrl(env))] }
})
