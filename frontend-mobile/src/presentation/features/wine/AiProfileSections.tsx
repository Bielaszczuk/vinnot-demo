/**
 * AiProfileSections — AI wine profile content cards, matching web parity.
 */
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Card } from "@/presentation/components/ui/Card";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { radii, tasteAttributeColors } from "@/shared/theme/tokens";
import type { AiWineProfile } from "@/domain/wine/wine.types";
import { DISH_ART, NOTE_ART } from "@/shared/profileArt";
import { WineColorSwatch } from "./WineColorSwatch";
import { resolveBarScore, toVignettes } from "./AiProfileSections.helpers";
import { RotatingVignette, type Vignette } from "./profileArt/RotatingVignette";
import { ServingArt } from "./profileArt/ServingArt";
import { useAppearProgress } from "./profileArt/useAppearProgress";
import { sensoryBarWidth } from "./sensoryBar";
import { styles, TAG_COLORS, type TagColor } from "./AiProfileSections.styles";


interface AiProfileSectionsProps {
  profile?: AiWineProfile;
  isLoading?: boolean;
}


export function AiProfileSections({ profile, isLoading }: AiProfileSectionsProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton height={112} radius={18} />
        <Skeleton height={160} radius={18} />
        <Skeleton height={200} radius={18} />
        <Skeleton height={140} radius={18} />
      </View>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        title={t("wines.aiProfileUnavailable")}
        description={t("wines.aiProfileUnavailableDescription")}
        style={styles.empty}
      />
    );
  }

  const pa = profile.palateAnalysis;
  const art = profile.profileArt;
  const servingArt = art?.serving ?? null;
  const serving = profile.servingRecommendations;

  return (
    <View style={styles.wrapper}>
      {/* Summary */}
      {!!profile.summary && (
        <Card style={styles.summaryCard} elevation="none" radius={radii["2xl"]}>
          <Text style={styles.sectionEyebrow}>{t("aiProfile.summary", t("wines.aiProfile"))}</Text>
          <Text style={styles.summary}>{profile.summary}</Text>
        </Card>
      )}

      {/* Visual Analysis */}
      {!!profile.visualAnalysis && (
        <Card style={styles.card} elevation="sm" radius={radii["2xl"]}>
          <Text style={styles.sectionTitle}>{t("aiProfile.visual.title", "Análisis Visual")}</Text>
          <View style={styles.visualColor}>
            <Text style={styles.fieldLabel}>{t("aiProfile.visual.color", "Color")}</Text>
            <WineColorSwatch
              tone={profile.visualColorTone}
              rim={profile.visualRimTone}
              intensity={profile.visualColorIntensity}
              reflections={profile.visualReflectionTones}
              highlights={profile.visualHighlights}
              label={profile.visualAnalysis.color}
            />
            <Text style={styles.fieldValue}>{profile.visualAnalysis.color}</Text>
          </View>
          <View style={styles.infoGrid}>
            {!!profile.visualAnalysis.clarity && (
              <InfoCell label={t("aiProfile.visual.clarity", "Claridad")} value={profile.visualAnalysis.clarity} />
            )}
            {!!profile.visualAnalysis.intensity && (
              <InfoCell label={t("aiProfile.visual.intensity", "Intensidad")} value={profile.visualAnalysis.intensity} />
            )}
            {!!profile.visualAnalysis.viscosity && (
              <InfoCell label={t("aiProfile.visual.viscosity", "Viscosidad")} value={profile.visualAnalysis.viscosity} />
            )}
          </View>
        </Card>
      )}

      {/* Aromatic Profile */}
      {!!profile.aromaticProfile && (
        <Card style={styles.card} elevation="sm" radius={radii["2xl"]}>
          <SectionHeader
            title={t("aiProfile.aromatic.title", "Perfil Aromático")}
            art={toVignettes(art?.aromas, NOTE_ART)}
            testID="profile-art-aromas"
          />
          {!!profile.aromaticProfile.intensity && (
            <InfoCell label={t("aiProfile.aromatic.intensity", "Intensidad")} value={profile.aromaticProfile.intensity} />
          )}
          {!!profile.aromaticProfile.primaryAromas?.length && (
            <View style={styles.aromaGroup}>
              <Text style={styles.fieldLabel}>{t("aiProfile.aromatic.primaryAromas", "Aromas primarios")}</Text>
              <TagRow tags={profile.aromaticProfile.primaryAromas} color="violet" />
            </View>
          )}
          {!!profile.aromaticProfile.secondaryAromas?.length && (
            <View style={styles.aromaGroup}>
              <Text style={styles.fieldLabel}>{t("aiProfile.aromatic.secondaryAromas", "Aromas secundarios")}</Text>
              <TagRow tags={profile.aromaticProfile.secondaryAromas} color="amber" />
            </View>
          )}
          {!!profile.aromaticProfile.bouquet && (
            <View style={styles.aromaGroup}>
              <Text style={styles.fieldLabel}>{t("aiProfile.aromatic.bouquet", "Bouquet")}</Text>
              <Text style={styles.fieldText}>{profile.aromaticProfile.bouquet}</Text>
            </View>
          )}
        </Card>
      )}

      {/* Palate Analysis — score bars + text details */}
      {!!pa && (
        <Card style={styles.card} elevation="sm" radius={radii["2xl"]}>
          <Text style={styles.sectionTitle}>{t("aiProfile.palate.title", "Análisis de Paladar")}</Text>

          {/* Score bars */}
          <View style={styles.barsGrid}>
            {(pa.sweetness || pa.sweetnessScore != null) && (
              <ScoreBar
                label={t("aiProfile.palate.sweetness", "Dulzor")}
                score={resolveBarScore(pa.sweetnessScore, pa.sweetness)}
                text={pa.sweetness}
                color={tasteAttributeColors.sweetness}
              />
            )}
            {(pa.acidity || pa.acidityScore != null) && (
              <ScoreBar
                label={t("aiProfile.palate.acidity", "Acidez")}
                score={resolveBarScore(pa.acidityScore, pa.acidity)}
                text={pa.acidity}
                color={tasteAttributeColors.acidity}
              />
            )}
            {(pa.tannin || pa.tanninScore != null) && (
              <ScoreBar
                label={t("aiProfile.palate.tannins", "Taninos")}
                score={resolveBarScore(pa.tanninScore, pa.tannin)}
                text={pa.tannin}
                color={tasteAttributeColors.tannin}
              />
            )}
            {(pa.body || pa.bodyScore != null) && (
              <ScoreBar
                label={t("aiProfile.palate.body", "Cuerpo")}
                score={resolveBarScore(pa.bodyScore, pa.body)}
                text={pa.body}
                color={tasteAttributeColors.body}
              />
            )}
          </View>

          {/* Text details */}
          <View style={[styles.infoGrid, styles.palateDetails]}>
            {!!pa.alcohol && (
              <InfoCell label={t("aiProfile.palate.alcohol", "Alcohol")} value={pa.alcohol} />
            )}
            {!!pa.texture && (
              <InfoCell label={t("aiProfile.palate.texture", "Textura")} value={pa.texture} />
            )}
            {!!pa.balance && (
              <InfoCell label={t("aiProfile.palate.balance", "Balance")} value={pa.balance} />
            )}
          </View>
        </Card>
      )}

      {/* Flavor Profile */}
      {!!profile.flavorProfile && (
        <Card style={styles.card} elevation="sm" radius={radii["2xl"]}>
          <SectionHeader
            title={t("aiProfile.flavor.title", "Perfil de Sabores")}
            art={toVignettes(art?.flavors, NOTE_ART)}
            testID="profile-art-flavors"
          />
          {!!profile.flavorProfile.primaryFlavors?.length && (
            <View style={styles.aromaGroup}>
              <Text style={styles.fieldLabel}>{t("aiProfile.flavor.primaryFlavors", "Sabores primarios")}</Text>
              <TagRow tags={profile.flavorProfile.primaryFlavors} color="rose" />
            </View>
          )}
          {!!profile.flavorProfile.secondaryFlavors?.length && (
            <View style={styles.aromaGroup}>
              <Text style={styles.fieldLabel}>{t("aiProfile.flavor.secondaryFlavors", "Sabores secundarios")}</Text>
              <TagRow tags={profile.flavorProfile.secondaryFlavors} color="emerald" />
            </View>
          )}
          <View style={styles.infoGrid}>
            {!!profile.flavorProfile.intensity && (
              <InfoCell label={t("aiProfile.flavor.intensity", "Intensidad")} value={profile.flavorProfile.intensity} />
            )}
            {!!profile.flavorProfile.finish && (
              <InfoCell label={t("aiProfile.flavor.finish", "Final")} value={profile.flavorProfile.finish} />
            )}
          </View>
        </Card>
      )}

      {/* Food Pairings */}
      {!!profile.foodPairings?.pairings?.length && (
        <Card style={styles.card} elevation="sm" radius={radii["2xl"]}>
          <SectionHeader
            title={t("aiProfile.foodPairings", t("wines.foodPairings"))}
            art={toVignettes(art?.pairings, DISH_ART)}
            testID="profile-art-pairings"
          />
          <TagRow tags={profile.foodPairings.pairings} color="green" />
          {!!profile.foodPairings.explanation && (
            <Text style={[styles.fieldText, { marginTop: 10 }]}>{profile.foodPairings.explanation}</Text>
          )}
        </Card>
      )}

      {/* Serving Recommendations */}
      {!!serving && (
        <Card style={styles.card} elevation="sm" radius={radii["2xl"]}>
          <Text style={styles.sectionTitle}>{t("aiProfile.serving.title", t("wines.serving"))}</Text>
          <View style={styles.servingGrid}>
            {!!serving.temperature && (
              <InfoCell
                label={t("aiProfile.serving.temperature", "Temperatura")}
                value={serving.temperature}
                art={servingArt && <ServingArt box="temperature" serving={servingArt} />}
              />
            )}
            {!!serving.glassware && (
              <InfoCell
                label={t("aiProfile.serving.glassware", "Copa")}
                value={serving.glassware}
                art={servingArt && <ServingArt box="glassware" serving={servingArt} />}
              />
            )}
            {!!serving.decanting && (
              <InfoCell
                label={t("aiProfile.serving.decanting", "Decantación")}
                value={serving.decanting}
                art={servingArt && <ServingArt box="decanting" serving={servingArt} />}
              />
            )}
            {!!serving.agingPotential?.trim() && (
              <InfoCell
                label={t("aiProfile.serving.aging", "Potencial de guarda")}
                value={serving.agingPotential}
                art={servingArt && <ServingArt box="aging" serving={servingArt} />}
              />
            )}
          </View>
        </Card>
      )}

      {/* Ideal Occasions */}
      {!!profile.idealOccasions?.length && (
        <Card style={styles.card} elevation="sm" radius={radii["2xl"]}>
          <Text style={styles.sectionTitle}>{t("aiProfile.idealOccasions", "Ocasiones ideales")}</Text>
          <TagRow tags={profile.idealOccasions} color="sky" />
        </Card>
      )}
      {!!profile.similarWines?.length && (
        <Card style={styles.card} elevation="sm" radius={radii["2xl"]}>
          <Text style={styles.sectionTitle}>{t("aiProfile.similarWines")}</Text>
          <TagRow tags={profile.similarWines} color="violet" />
        </Card>
      )}
    </View>
  );
}

/* ── Sub-components ─────────────────────────────────── */

/** Section title with its rotating art beside it; the art wraps under the title when it is wider. */
function SectionHeader({ title, art, testID }: { title: string; art: Vignette[]; testID: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, styles.sectionHeaderTitle]}>{title}</Text>
      <RotatingVignette items={art} testID={testID} />
    </View>
  );
}

/** A labeled value; with an illustration, the art sits on top and the label and value center under it. */
function InfoCell({ label, value, art }: { label: string; value: string; art?: ReactNode }) {
  return (
    <View style={[styles.infoCell, !!art && styles.infoCellWithArt]}>
      {art}
      <Text style={[styles.fieldLabel, !!art && styles.centered]}>{label}</Text>
      <Text style={[styles.fieldValue, !!art && [styles.centered, styles.artValue]]}>{value}</Text>
    </View>
  );
}

function TagRow({ tags, color }: { tags: string[]; color: TagColor }) {
  const { bg, text, border } = TAG_COLORS[color];
  return (
    <View style={styles.tagRow}>
      {tags.map((tag) => (
        <View key={tag} style={[styles.tagPill, { backgroundColor: bg, borderColor: border }]}>
          <Text style={[styles.tagText, { color: text }]}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

function ScoreBar({ label, score, text, color }: { label: string; score: number; text?: string | null; color: string }) {
  const displayScore = sensoryBarWidth(score);
  const progress = useAppearProgress();
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  return (
    <View style={styles.scoreBarWrap}>
      <View style={styles.scoreBarHeader}>
        <Text style={styles.scoreBarLabel}>{label}</Text>
        <Text style={styles.scoreBarValue}>{text ?? `${score}%`}</Text>
      </View>
      <View style={styles.scoreBarTrack} accessible accessibilityRole="progressbar"
        accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: score }}>
        <Animated.View style={[styles.scoreBarFill, { width: `${displayScore}%`, backgroundColor: color }, fill]} />
      </View>
    </View>
  );
}
