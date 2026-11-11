/**
 * TasteProfileCard — the illustrated taste profile of a public profile: the taste wheel
 * (or its locked state), then «Estructura» with one illustrated scale per trait, then the
 * preferred aroma families as illustrated chips. The art is decorative; the text carries
 * the meaning. A section without data is hidden. Traits seeded by the taste quiz say so,
 * and without a wheel yet a locked wheel takes its place above them, as on the web. The
 * own profile can adjust «Estructura» by hand (the editor comes from the screen, so visitors
 * never get one) and ends with the taste quiz entry. Hand-set traits carry an «Ajustado» tag.
 */
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react-native";
import {
  TASTE_TRAITS,
  type TasteFamilyShare,
  type TasteSlice,
  type TasteTrait,
  type TasteTraitScore,
  type TasteTraits,
} from "@/domain/social/social.types";
import { tasteTraitLevel } from "@/domain/social/socialRules";
import { Button } from "@/presentation/components/ui/Button";
import { Card } from "@/presentation/components/ui/Card";
import { useAppearProgress } from "@/presentation/features/wine/profileArt/useAppearProgress";
import { sensoryBarWidth } from "@/presentation/features/wine/sensoryBar";
import { TASTE_ART, tasteFamilyArt, tasteTraitArt } from "@/shared/profileArt";
import { editorial, radii, tasteAttributeColors, wine, type TasteAttribute } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import { TasteTraitSlider } from "./TasteTraitSlider";
import { TasteWheel } from "./TasteWheel";
import type { TasteStructureEditor } from "./useTasteStructureEditor";

const TRAIT_COLOR: Record<TasteTrait, TasteAttribute> = {
  ACIDITY: "acidity",
  BODY: "body",
  TANNIN: "tannin",
  SWEETNESS: "sweetness",
};
const MARKER_SIZE = 12;

/** The own profile's way into the taste quiz. */
export interface TasteQuizEntry {
  completed: boolean;
  onPress: () => void;
}

interface TasteProfileCardProps {
  wheel: TasteSlice[] | null;
  traits: TasteTraits | null;
  isOwn: boolean;
  /** Only on the own profile. */
  quizEntry?: TasteQuizEntry | null;
  /** Only on the own profile: «Ajustar» turns the structure into sliders. */
  editor?: TasteStructureEditor | null;
}

export function TasteProfileCard({ wheel, traits, isOwn, quizEntry, editor }: TasteProfileCardProps) {
  const { t } = useTranslation();
  const structure = traits?.structure ?? [];
  const families = traits?.families ?? [];
  const hasTraits = structure.length > 0 || families.length > 0;

  return (
    <Card style={styles.card} elevation="sm" radius={radii["2xl"]} padding={18}>
      <View style={styles.heading}>
        <Text style={styles.title}>{t(isOwn ? "social.taste.titleOwn" : "social.taste.title")}</Text>
        {traits?.fromQuiz ? (
          <Text style={styles.quizNote}>{t(isOwn ? "social.taste.fromQuizOwn" : "social.taste.fromQuiz")}</Text>
        ) : null}
      </View>
      {wheel ? <TasteWheel slices={wheel} /> : hasTraits ? <WheelHint isOwn={isOwn} /> : <TasteLocked isOwn={isOwn} />}

      {structure.length > 0 || editor ? (
        <View style={styles.section} testID="taste-structure">
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("social.taste.structureTitle")}</Text>
            {editor && !editor.editing ? (
              <Button variant="ghost" size="sm" onPress={editor.start} testID="taste-adjust">
                {t("social.taste.adjust.start")}
              </Button>
            ) : null}
          </View>
          {editor?.editing ? (
            <StructureEditor editor={editor} structure={structure} />
          ) : structure.length > 0 ? (
            <View style={styles.rows}>
              {structure.map((row) => (
                <TraitRow key={row.trait} row={row} />
              ))}
            </View>
          ) : (
            <Text style={styles.emptyStructure}>{t("social.taste.adjust.empty")}</Text>
          )}
        </View>
      ) : null}

      {families.length > 0 ? (
        <View style={styles.section} testID="taste-aromas">
          <Text style={styles.sectionTitle}>
            {t(isOwn ? "social.taste.aromasTitleOwn" : "social.taste.aromasTitle")}
          </Text>
          <View style={styles.chips}>
            {families.map((share) => (
              <FamilyChip key={share.family} share={share} />
            ))}
          </View>
        </View>
      ) : null}

      {quizEntry ? (
        <Button variant="outline" size="sm" fullWidth onPress={quizEntry.onPress} testID="taste-quiz-entry">
          {t(quizEntry.completed ? "social.taste.quizRetake" : "social.taste.quizTake")}
        </Button>
      ) : null}
    </Card>
  );
}

/** The wheel still needs rated wines: its locked emblem holds the wheel's place above the traits. */
function WheelHint({ isOwn }: { isOwn: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.hint} testID="taste-wheel-hint">
      <View style={styles.hintWell}>
        <Image accessible={false} source={TASTE_ART.GRAPE_CLUSTER} style={styles.hintArt} contentFit="contain" />
        <View style={styles.hintLock} testID="taste-wheel-lock">
          <Lock size={13} color={wine[700]} />
        </View>
      </View>
      <Text style={styles.hintText}>{t(isOwn ? "social.taste.wheelHintOwn" : "social.taste.wheelHint")}</Text>
    </View>
  );
}

function TasteLocked({ isOwn }: { isOwn: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.locked} testID="taste-locked">
      <Image accessible={false} source={TASTE_ART.GRAPE_CLUSTER} style={styles.lockedArt} contentFit="contain" />
      <Text style={styles.lockedText}>{t(isOwn ? "social.taste.lockedOwn" : "social.taste.locked")}</Text>
    </View>
  );
}

/** The four traits as sliders, then «Cancelar» / «Guardar» and, with hand-set traits, the reset. */
function StructureEditor({ editor, structure }: { editor: TasteStructureEditor; structure: TasteTraitScore[] }) {
  const { t } = useTranslation();
  const adjusted = new Set(structure.filter((row) => row.adjusted).map((row) => row.trait));
  return (
    <>
      <Text style={styles.editHint}>{t("social.taste.adjust.hint")}</Text>
      <View style={styles.rows}>
        {TASTE_TRAITS.map((trait) => {
          const name = t(`social.taste.traits.${trait}`);
          const level = t(`social.taste.levels.${trait}.${tasteTraitLevel(editor.values[trait])}`);
          const color = tasteAttributeColors[TRAIT_COLOR[trait]];
          return (
            <View key={trait} style={styles.row}>
              <Image accessible={false} source={tasteTraitArt(trait)} style={styles.rowArt} contentFit="contain" />
              <View style={styles.rowBody}>
                <TraitHeader trait={trait} name={name} level={level} color={color} adjusted={adjusted.has(trait)} />
                <TasteTraitSlider
                  trait={trait}
                  name={name}
                  level={level}
                  value={editor.values[trait]}
                  color={color}
                  onChange={(value) => editor.change(trait, value)}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.editActions}>
        <Button variant="outline" size="sm" onPress={editor.cancel} disabled={editor.pending} style={styles.editAction} testID="taste-cancel">
          {t("social.taste.adjust.cancel")}
        </Button>
        <Button size="sm" onPress={editor.save} loading={editor.pending} style={styles.editAction} testID="taste-save">
          {t("social.taste.adjust.save")}
        </Button>
      </View>
      {editor.canReset ? (
        <Button variant="ghost" size="sm" fullWidth onPress={editor.reset} disabled={editor.pending} testID="taste-reset">
          {t("social.taste.adjust.reset")}
        </Button>
      ) : null}
    </>
  );
}

interface TraitHeaderProps {
  trait: TasteTrait;
  name: string;
  level: string;
  color: string;
  adjusted: boolean;
}

/** Trait name, its «Ajustado» tag when set by hand, and the level word in the trait colour. */
function TraitHeader({ trait, name, level, color, adjusted }: TraitHeaderProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.rowHeader}>
      <View style={styles.rowTitle}>
        <Text style={styles.rowName}>{name}</Text>
        {adjusted ? (
          <View style={styles.tag} testID={`taste-adjusted-${trait}`}>
            <Text style={styles.tagText}>{t("social.taste.adjust.tag")}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.rowLevel, { color }]}>{level}</Text>
    </View>
  );
}

function TraitRow({ row }: { row: TasteTraitScore }) {
  const { t } = useTranslation();
  const progress = useAppearProgress();
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  const name = t(`social.taste.traits.${row.trait}`);
  const level = t(`social.taste.levels.${row.trait}.${tasteTraitLevel(row.score)}`);
  const color = tasteAttributeColors[TRAIT_COLOR[row.trait]];
  const position = sensoryBarWidth(row.score);

  return (
    <View style={styles.row} testID={`taste-trait-${row.trait}`}>
      <Image accessible={false} source={tasteTraitArt(row.trait)} style={styles.rowArt} contentFit="contain" />
      <View style={styles.rowBody}>
        <TraitHeader trait={row.trait} name={name} level={level} color={color} adjusted={row.adjusted} />
        <View
          style={styles.scale}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t("social.taste.traitA11y", { trait: name, level })}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(row.score) }}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width: `${position}%`, backgroundColor: color }, fill]} />
          </View>
          <View style={[styles.marker, { left: `${position}%`, borderColor: color }]} />
        </View>
      </View>
    </View>
  );
}

function FamilyChip({ share }: { share: TasteFamilyShare }) {
  const { t } = useTranslation();
  const name = t(`social.taste.families.${share.family}`);
  const percent = Math.round(share.percent);
  return (
    <View
      style={styles.chip}
      testID={`taste-family-${share.family}`}
      accessible
      accessibilityLabel={t("social.taste.familyA11y", { family: name, percent })}
    >
      <Image accessible={false} source={tasteFamilyArt(share.family)} style={styles.chipArt} contentFit="contain" />
      <Text style={styles.chipName}>{name}</Text>
      <Text style={styles.chipPercent}>{`${percent}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 18,
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    backgroundColor: vinnotColors.surface,
  },
  heading: { gap: 2 },
  title: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.lg,
    lineHeight: 24,
    color: vinnotColors.ink,
  },
  quizNote: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    color: vinnotColors.muted,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: editorial.creamMuted,
    backgroundColor: editorial.cream,
  },
  hintWell: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 40,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: wine[200],
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  hintArt: { width: 48, height: 48, opacity: 0.45 },
  hintLock: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: wine[100],
    backgroundColor: "#FFFFFF",
  },
  hintText: {
    flex: 1,
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: vinnotColors.ink,
  },
  section: {
    gap: 12,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: vinnotColors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    // The small button is taller than the title; this keeps the section's rhythm.
    marginVertical: -6,
  },
  emptyStructure: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    color: vinnotColors.muted,
  },
  editHint: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    color: vinnotColors.muted,
  },
  editActions: { flexDirection: "row", gap: 10 },
  editAction: { flex: 1 },
  rowTitle: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: editorial.cream,
  },
  tagText: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes["2xs"],
    lineHeight: 14,
    color: vinnotColors.muted,
  },
  sectionTitle: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: vinnotColors.brand,
  },
  locked: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: editorial.creamMuted,
    backgroundColor: editorial.cream,
  },
  lockedArt: { width: 64, height: 64, opacity: 0.55 },
  lockedText: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    textAlign: "center",
    color: vinnotColors.ink,
  },
  rows: { gap: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowArt: { width: 44, height: 44 },
  rowBody: { flex: 1, gap: 8 },
  rowHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  rowName: {
    flexShrink: 1,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    color: vinnotColors.ink,
  },
  rowLevel: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes.xs,
    lineHeight: 17,
  },
  scale: { height: MARKER_SIZE, justifyContent: "center" },
  track: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: editorial.cream,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radii.full, opacity: 0.55, transformOrigin: "left" },
  marker: {
    position: "absolute",
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    marginLeft: -MARKER_SIZE / 2,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 2,
    backgroundColor: vinnotColors.surface,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: editorial.creamMuted,
    backgroundColor: editorial.cream,
  },
  chipArt: { width: 30, height: 30 },
  chipName: {
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    color: vinnotColors.ink,
  },
  chipPercent: {
    fontFamily: vinnotFonts.regular,
    fontSize: fontSizes.meta,
    lineHeight: 16,
    color: vinnotColors.muted,
  },
});
