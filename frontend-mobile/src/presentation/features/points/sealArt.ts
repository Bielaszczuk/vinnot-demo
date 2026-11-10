/** Wax-seal art per tier (S1): `assets/images/emblems/<slug>.webp`. */
import type { BadgeTierSlug } from "@/domain/points/badgeTiers";
import broteSeal from "../../../../assets/images/emblems/brote.webp";
import parraSeal from "../../../../assets/images/emblems/parra.webp";
import racimoSeal from "../../../../assets/images/emblems/racimo.webp";
import vendimiaSeal from "../../../../assets/images/emblems/vendimia.webp";
import lagarSeal from "../../../../assets/images/emblems/lagar.webp";
import barricaSeal from "../../../../assets/images/emblems/barrica.webp";
import crianzaSeal from "../../../../assets/images/emblems/crianza.webp";
import reservaSeal from "../../../../assets/images/emblems/reserva.webp";
import granReservaSeal from "../../../../assets/images/emblems/gran-reserva.webp";
import granEnofiloSeal from "../../../../assets/images/emblems/gran-enofilo.webp";
import vinnotSeal from "../../../../assets/images/emblems/vinnot.webp";

/** Metro asset ids; Skia `useImage` and React Native `Image` both accept them. */
export const SEAL_ART: Record<BadgeTierSlug, number> = {
  brote: broteSeal,
  parra: parraSeal,
  racimo: racimoSeal,
  vendimia: vendimiaSeal,
  lagar: lagarSeal,
  barrica: barricaSeal,
  crianza: crianzaSeal,
  reserva: reservaSeal,
  "gran-reserva": granReservaSeal,
  "gran-enofilo": granEnofiloSeal,
  vinnot: vinnotSeal,
};
