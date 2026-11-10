/**
 * Cellar domain validators (Zod schemas).
 */
import { z } from "zod";
import { VINTAGE_MIN_YEAR } from "@/domain/wine/vintage";
import { ratingSchema } from "@/domain/wine/wine.validators";

const vintageSchema = z.number().int().min(VINTAGE_MIN_YEAR).max(new Date().getFullYear() + 1).nullable().optional();

export const addToCellarSchema = z.object({
  wineId: z.string().min(1, "Seleccioná un vino"),
  rating: ratingSchema.nullable().optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  vintage: vintageSchema,
});

export const updateCellarEntrySchema = z.object({
  rating: ratingSchema.nullable().optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  vintage: vintageSchema,
});

export type AddToCellarInput = z.infer<typeof addToCellarSchema>;
export type UpdateCellarEntryInput = z.infer<typeof updateCellarEntrySchema>;

