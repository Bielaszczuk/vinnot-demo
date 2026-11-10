import { z } from "zod";

export const wineFilterSchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  minRating: z.number().min(1).max(5).optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  vintage: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
});

/** A rating from 0.1 to 5.0 with at most one decimal (S8). */
export const ratingSchema = z
  .number()
  .min(0.1)
  .max(5)
  .refine((value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-6, "One decimal at most");

export const wineReviewSchema = z.object({
  rating: ratingSchema,
  comment: z.string().min(10, "El comentario debe tener al menos 10 caracteres").max(2000).optional(),
  tastingNotes: z
    .object({
      nose: z.string().max(500).optional(),
      palate: z.string().max(500).optional(),
      finish: z.string().max(500).optional(),
      color: z.string().max(200).optional(),
    })
    .optional(),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""));

/** Decimal keyboards may use a comma in Spanish locales. */
export function parseAlcoholContent(value: string): number {
  const normalized = value.trim().replace(",", ".");
  return /^\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export const wineSubmissionSchema = z.object({
  wineName: z.string().trim().min(1, "Ingresá el nombre del vino").max(255),
  wineryName: z.string().trim().min(1, "Ingresá la bodega").max(255),
  wineType: optionalText(50),
  vintage: optionalText(4).refine(
    (value) =>
      !value ||
      (Number.isInteger(Number(value)) &&
        Number(value) >= 1800 &&
        Number(value) <= new Date().getFullYear() + 1),
    "Ingresá una añada válida",
  ),
  wineryId: z.string().optional(),
  grapes: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
  country: optionalText(100),
  countryId: z.string().optional(),
  region: optionalText(100),
  regionId: z.string().optional(),
  alcoholContent: optionalText(6).refine(
    (value) => !value || (parseAlcoholContent(value) >= 0 && parseAlcoholContent(value) <= 100),
    "Ingresá un porcentaje válido",
  ),
  notes: optionalText(1000),
});

export type WineFilterInput = z.infer<typeof wineFilterSchema>;
export type WineReviewInput = z.infer<typeof wineReviewSchema>;
export type WineSubmissionFormInput = z.infer<typeof wineSubmissionSchema>;
