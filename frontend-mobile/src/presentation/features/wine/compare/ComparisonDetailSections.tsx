/**
 * ComparisonDetailSections — best-for, choose-if, pairings and serving/aging cards.
 * Each section renders nothing when its data is absent (legacy cached comparisons).
 */
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type {
  ComparisonChoice,
  ComparisonPairings,
  ComparisonPerWine,
  ComparisonServing,
} from "@/domain/wine/wine.types";
import { sectionStyles as styles } from "./compareSections.styles";
import {
  DetailItem,
  InfoCell,
  SectionCard,
  TagRow,
  WinePill,
  wineNameFor,
  type WineNames,
  type WineSide,
} from "./ComparisonParts";

const SIDES = ["A", "B"] as const;
const sideKey = (side: WineSide) => (side === "A" ? "wineA" : "wineB");

export function ComparisonBestFor({ bestFor, ...names }: WineNames & { bestFor?: { wineA: string[]; wineB: string[] } }) {
  const { t } = useTranslation();
  const sides = SIDES.filter((side) => !!bestFor?.[sideKey(side)]?.length);
  if (!bestFor || sides.length === 0) return null;
  return (
    <SectionCard title={t("compare.bestFor", "Para quién es")}>
      {sides.map((side) => (
        <View key={side} style={styles.group}>
          <WinePill label={wineNameFor(side, names)} tint={side} />
          <TagRow tags={bestFor[sideKey(side)]} tint={side} />
        </View>
      ))}
    </SectionCard>
  );
}

export function ComparisonChooseIf({ choices, ...names }: WineNames & { choices?: ComparisonChoice[] }) {
  const { t } = useTranslation();
  if (!choices?.length) return null;
  return (
    <SectionCard title={t("compare.chooseIf.title", "Según tu gusto")}>
      {SIDES.map((side) => {
        const picked = choices.filter((choice) => choice.pick === side);
        if (picked.length === 0) return null;
        return (
          <View key={side} style={styles.group}>
            <WinePill tint={side} label={t("compare.chooseIf.pick", {
              wine: wineNameFor(side, names), defaultValue: "Andá por {{wine}}",
            })} />
            {picked.map((choice) => (
              <DetailItem key={choice.situation} title={choice.situation} detail={choice.why} />
            ))}
          </View>
        );
      })}
    </SectionCard>
  );
}

export function ComparisonPairingsSection({ pairings, ...names }: WineNames & { pairings?: ComparisonPairings }) {
  const { t } = useTranslation();
  if (!pairings) return null;
  return (
    <SectionCard title={t("compare.pairings.title", "Maridajes")}>
      {SIDES.map((side) => {
        const dishes = pairings[sideKey(side)];
        if (dishes.length === 0) return null;
        return (
          <View key={side} style={styles.group}>
            <WinePill label={wineNameFor(side, names)} tint={side} />
            {dishes.map((pairing) => <DetailItem key={pairing.dish} title={pairing.dish} detail={pairing.why} />)}
          </View>
        );
      })}
      {!!pairings.shared && (
        <View style={styles.group}>
          <WinePill label={t("compare.pairings.shared", "Para los dos")} tint="shared" />
          <DetailItem title={pairings.shared.dish} detail={pairings.shared.why} shared />
        </View>
      )}
    </SectionCard>
  );
}

export function ComparisonServingAging({
  serving, aging, ...names
}: WineNames & { serving?: ComparisonPerWine<ComparisonServing>; aging?: ComparisonPerWine<string> }) {
  const { t } = useTranslation();
  const sides = SIDES.filter((side) => !!serving?.[sideKey(side)] || !!aging?.[sideKey(side)]);
  if (sides.length === 0) return null;
  return (
    <SectionCard title={t("compare.serving.title", "Servicio y guarda")}>
      {sides.map((side) => {
        const wineServing = serving?.[sideKey(side)];
        const wineAging = aging?.[sideKey(side)];
        return (
          <View key={side} style={styles.group}>
            <WinePill label={wineNameFor(side, names)} tint={side} />
            <View style={styles.infoGrid}>
              {!!wineServing?.temperature && (
                <InfoCell label={t("compare.serving.temperature", "Temperatura")} value={wineServing.temperature} />
              )}
              {!!wineServing?.decanting && (
                <InfoCell label={t("compare.serving.decanting", "Decantación")} value={wineServing.decanting} />
              )}
              {!!wineAging && <InfoCell label={t("compare.serving.aging", "Guarda")} value={wineAging} />}
            </View>
          </View>
        );
      })}
    </SectionCard>
  );
}
