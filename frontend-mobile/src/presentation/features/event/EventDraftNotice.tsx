import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { EventDraft } from '@/domain/event/eventDraft';
import { Button } from '@/presentation/components/ui/Button';
import { vinnotColors as colors, vinnotFonts as fonts } from '@/shared/theme/vinnotTheme';
import { fontSizes } from "@/shared/theme/typography";
import { radii } from "@/shared/theme/tokens";
export interface EventDraftNoticeProps {
  status: string
  recovery: EventDraft | null
  confirmDiscard: boolean
  setConfirmDiscard: (value: boolean) => void
  restore: () => void
  discard: () => Promise<void>
  persist: () => Promise<boolean>
  disabled?: boolean
}

export function EventDraftNotice({ status, recovery, confirmDiscard, setConfirmDiscard, restore, discard, persist, disabled }: EventDraftNoticeProps) {
  const unavailable = disabled || status === "loading";
  const { t } = useTranslation();
  return <View style={styles.container}>
    <Text accessibilityLiveRegion="polite" style={styles.text}>{t(recovery ? 'eventDraft.found' : `eventDraft.${status}`)}</Text>
    {confirmDiscard ? <>
      <Text style={styles.text}>{t('eventDraft.confirm')}</Text>
      <Button variant="ghost" disabled={unavailable} onPress={() => void discard()}>{t('eventDraft.confirmAction')}</Button>
      <Button variant="ghost" disabled={status === "loading"} onPress={() => setConfirmDiscard(false)}>{t('eventDraft.keep')}</Button>
    </> : <>
      {recovery && <Button disabled={unavailable} onPress={restore}>{t('eventDraft.restore')}</Button>}
      {status === 'error' && !recovery && <Button variant="ghost" disabled={unavailable} onPress={() => void persist()}>{t('eventDraft.retry')}</Button>}
      {/* Autosave runs on every keystroke; keep "saving" here so the layout above the fields stays stable. */}
      {(recovery || status === 'saving' || status === 'saved' || status === 'error') &&<Button variant="ghost" disabled={unavailable} onPress={() => setConfirmDiscard(true)}>{t('eventDraft.discard')}</Button>}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  container: { padding: 14, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 },
  text: { fontFamily: fonts.regular, fontSize: fontSizes.sm, lineHeight: 20, color: colors.muted },
});
