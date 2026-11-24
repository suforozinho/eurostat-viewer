import { z } from "zod";

/**
 * Zod schema for the subset of JSON-stat 2.0 the app relies on.
 *
 * Written against real Eurostat responses saved in `fixtures/`, and kept
 * permissive where the JSON-stat spec allows several shapes:
 * - `value` can be a dense array or a sparse object keyed by flat position.
 * - `category.index` can be an object (code → position) or an array of codes.
 * - `status` can be a single string, an array, or a sparse object.
 *
 * Unknown keys (Eurostat's `extension`, `source`, …) are allowed and ignored.
 */

const CategorySchema = z.object({
  index: z.union([z.record(z.string(), z.number().int().nonnegative()), z.array(z.string())]),
  label: z.record(z.string(), z.string()).optional(),
});

const DimensionSchema = z.object({
  label: z.string().optional(),
  category: CategorySchema,
});

export const JsonStatDatasetSchema = z
  .object({
    version: z.string().optional(),
    class: z.literal("dataset"),
    label: z.string().optional(),
    updated: z.string().optional(),
    id: z.array(z.string()).min(1),
    size: z.array(z.number().int().nonnegative()).min(1),
    dimension: z.record(z.string(), DimensionSchema),
    value: z.union([z.array(z.number().nullable()), z.record(z.string(), z.number().nullable())]),
    status: z
      .union([z.string(), z.array(z.string().nullable()), z.record(z.string(), z.string())])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.id.length !== data.size.length) {
      ctx.addIssue({
        code: "custom",
        message: `id has ${data.id.length} entries but size has ${data.size.length}`,
        path: ["size"],
      });
    }
    for (const dim of data.id) {
      if (!(dim in data.dimension)) {
        ctx.addIssue({
          code: "custom",
          message: `dimension "${dim}" is listed in id but missing from dimension`,
          path: ["dimension", dim],
        });
      }
    }
  });

export type JsonStatDataset = z.infer<typeof JsonStatDatasetSchema>;

/** Eurostat's error body, e.g. for a 404: `{ "error": [{ status, id, label }] }`. */
export const EurostatErrorBodySchema = z.object({
  error: z
    .array(
      z.object({
        status: z.number().optional(),
        id: z.number().optional(),
        label: z.string().optional(),
      }),
    )
    .min(1),
});
