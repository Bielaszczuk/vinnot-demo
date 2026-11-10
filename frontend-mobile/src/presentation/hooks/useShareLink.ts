import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShareContentInput } from '@/domain/sharing/contentLink';
import { sharingService } from '@/application/services/sharing.service';
import { useToast } from '@/presentation/providers/ToastProvider';

export function useShareLink() {
  const { t } = useTranslation();
  const { showError } = useToast();
  return useCallback(async (input: ShareContentInput) => {
    const result = await sharingService.shareContent(input);
    if (result === 'failed') showError(t('common.shareFailed'));
    return result;
  }, [showError, t]);
}
