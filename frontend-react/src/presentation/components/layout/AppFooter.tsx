/**
 * AppFooter — layout component
 *
 * Warm dark footer: trust section with Lucide marks, brand column and the
 * discover, company and legal link columns.
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FooterSocialLinks } from './FooterSocialLinks'
import { Grape, Route, Sparkles, Star } from 'lucide-react'
import { VinnotBrand } from '@components/brand/VinnotBrand'
import { Icon } from '@components/ui/Icon'

export function AppFooter() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    discover: [
      { label: t('compare.browseWines'), path: '/wines' },
      { label: t('nav.routes'), path: '/wine-routes' },
      { label: t('nav.events'), path: '/events' },
      { label: t('scan.scanWine'), path: '/wines/scan' },
    ],
    company: [
      { label: t('footer.aboutUs'), path: '/about' },
      { label: t('footer.contact'), path: '/contact' },
      { label: t('profile.help', 'Ayuda'), path: '/help' },
      { label: t('footer.legal'), path: '/legal' },
    ],
    legal: [
      { label: t('footer.termsOfUse'), path: '/terms' },
      { label: t('auth.privacyPolicy'), path: '/privacy' },
      { label: t('footer.cookiePolicy'), path: '/cookies' },
      { label: t('footer.contentPolicy'), path: '/content-policy' },
    ],
  }

  const features = [
    {
      icon: Grape,
      title: t('footer.featureDiscover'),
      description: t('footer.featureDiscoverDesc'),
    },
    {
      icon: Sparkles,
      title: t('footer.featureExpert'),
      description: t('footer.featureExpertDesc'),
    },
    {
      icon: Route,
      title: t('footer.featureRoutes'),
      description: t('footer.featureRoutesDesc'),
    },
    {
      icon: Star,
      title: t('footer.featureReviews'),
      description: t('footer.featureReviewsDesc'),
    },
  ]

  return (
    <footer className="bg-gray-900">
      {/* Trust Section */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-white text-center mb-8 sm:mb-10">
            {t('footer.trustedBy')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3 sm:gap-4 group">
                <div className="flex w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 items-center justify-center bg-white/10 rounded-xl text-wine-200 group-hover:bg-wine-500/20 transition-colors">
                  <Icon icon={feature.icon} size="lg" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-0.5 sm:mb-1 text-sm sm:text-base">{feature.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2 lg:col-span-2">
              <Link to="/" aria-label="Vinnot" className="flex items-center gap-2 mb-4">
                <VinnotBrand compact className="text-white/90 group-hover:text-white" />
              </Link>
              <p className="text-gray-400 text-sm max-w-sm">
                {t('footer.brandDescription')}
              </p>
              <FooterSocialLinks />
            </div>

            {/* Discover Links */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t('footer.discover')}</h4>
              <ul className="space-y-3">
                {footerLinks.discover.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-gray-400 hover:text-white text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t('footer.company')}</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-gray-400 hover:text-white text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t('footer.legal')}</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-gray-400 hover:text-white text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-400 text-xs">
                © {currentYear} Vinnot. {t('footer.allRightsReserved')}
              </p>
              <p className="text-gray-400 text-xs">
                {t('footer.madeWith')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
