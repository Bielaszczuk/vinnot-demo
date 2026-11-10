import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

const testFiles = ['src/**/*.{test,spec}.{ts,tsx}', 'tests/unit/**/*.{test,spec}.{ts,tsx}']
// Tests that stub the whole `window` global with vi.stubGlobal('window', ...).
const windowReplacingTests = [
  'src/infrastructure/payments/paymentAuthorization.browser.test.ts',
  'src/infrastructure/platform/browserNavigation.test.ts',
]

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@app': path.resolve(import.meta.dirname, 'src/app'),
      '@shared': path.resolve(import.meta.dirname, 'src/shared'),
      '@domain': path.resolve(import.meta.dirname, 'src/domain'),
      '@application': path.resolve(import.meta.dirname, 'src/application'),
      '@infrastructure': path.resolve(import.meta.dirname, 'src/infrastructure'),
      '@presentation': path.resolve(import.meta.dirname, 'src/presentation'),
      '@api': path.resolve(import.meta.dirname, 'src/infrastructure/api'),
      '@config': path.resolve(import.meta.dirname, 'src/shared/config'),
      '@services': path.resolve(import.meta.dirname, 'src/application/services'),
      '@stores': path.resolve(import.meta.dirname, 'src/presentation/stores'),
      '@hooks': path.resolve(import.meta.dirname, 'src/presentation/hooks'),
      '@components': path.resolve(import.meta.dirname, 'src/presentation/components'),
      '@pages': path.resolve(import.meta.dirname, 'src/presentation/pages'),
      '@utils': path.resolve(import.meta.dirname, 'src/shared/utils'),
      '@i18n': path.resolve(import.meta.dirname, 'src/shared/i18n'),
      '@mocks': path.resolve(import.meta.dirname, 'src/infrastructure/mocks'),
      '@assets': path.resolve(import.meta.dirname, 'src/shared/assets'),
      '@types': path.resolve(import.meta.dirname, 'src/shared/types'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    css: false,
    // Recycles a VM worker once its heap passes 512 MB. Vitest reads this from the root config only, and it applies
    // only to the vm pools. The default (system memory / workers) lets each heap grow to several GB, which made
    // garbage collection slower and used about twice the memory.
    vmMemoryLimit: '512MB',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          // vmThreads reuses one worker per thread and gives each file a fresh VM context, so jsdom is not
          // rebuilt from a new worker for every file: the suite spends far less time on environment setup.
          pool: 'vmThreads',
          include: testFiles,
          exclude: windowReplacingTests,
        },
      },
      {
        extends: true,
        test: {
          // The jsdom window is the global object of a VM context and cannot be redefined, so tests that
          // replace `window` as a whole run in the default (forks) pool.
          name: 'window-stubs',
          include: windowReplacingTests,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'src/presentation/hooks/usePaymentAccountConnection.ts',
        'src/domain/media/imageCrop.ts',
        'src/domain/media/imageAspect.ts',
        'src/infrastructure/media/canvasImageCropper.ts',
        'src/presentation/hooks/usePendingImageCrop.ts',
        'src/presentation/components/features/media/ImageCropDialog.tsx',
        'src/infrastructure/payments/paymentAuthorization.browser.ts',
        'src/domain/event/eventEditor.ts',
        'src/domain/event/eventDraft.ts',
        'src/domain/user/contactPhone.ts',
        'src/domain/wine/wine.vintage.ts',
        'src/presentation/pages/events/useEventRegistrationForm.ts',
        'public/share-assets/*.js',
        'src/domain/user/returnPath.ts',
        'src/domain/sharing/*.ts',
        'src/presentation/hooks/useReauthentication.ts',
        'src/infrastructure/http/browserSession.ts',
        'src/presentation/components/auth/AuthSocialButtons.tsx',
        'src/presentation/components/brand/VinnotBrand.tsx',
        'src/presentation/components/brand/SocialIcons.tsx',
        'src/presentation/components/brand/brandAssets.ts',
        'src/presentation/components/brand/BrandHeroImage.tsx',
        'src/domain/public/*.ts',
        'src/domain/legal/*.ts',
        'src/presentation/hooks/useLegalAgreement.ts',
        'src/presentation/hooks/usePublicDocument.ts',
        'src/presentation/feedback/illustratedState.ts',
        'src/presentation/feedback/authErrorMessage.ts',
        'src/presentation/hooks/useSupportForm.ts',
        'src/presentation/hooks/useSupportReference.ts',
        'src/infrastructure/support/clipboard.ts',
        'src/presentation/hooks/useRetryDeadline.ts',
        'src/infrastructure/http/retryAfter.ts',
        'src/presentation/hooks/queries/admin/useAdminSubmissionImage.ts',
        'src/presentation/hooks/queries/partner/usePartnerEventMutations.ts',
        'src/presentation/hooks/queries/wine/useWineComparison.ts',
        'src/application/services/*.service.ts',
        'src/domain/**/*.mappers*.ts',
        'src/domain/**/*.validators.ts',
        'src/domain/wine/wine.quick-info.ts',
        'src/shared/utils/sensory-bar.ts',
        'src/shared/utils/locale.ts',
        'src/presentation/hooks/useReducedMotion.ts',
        'src/presentation/components/ui/{Button,LinkButton,Icon,RatingStars,Input,Select,Textarea,PageBanner,PageLoader,EmptyState,Pagination}.tsx',
        'src/presentation/components/ui/fieldStyles.ts',
        'src/presentation/components/ui/buttonStyles.ts',
        'src/presentation/components/ui/iconScale.ts',
        'src/presentation/components/features/wine/aiProcess/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/domain/wine/wine.mappers.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 60,
        functions: 100,
        lines: 100,
      },
    },
  },
})
