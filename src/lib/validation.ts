import { z } from "zod";

export const RecommendationsRequestSchema = z.object({
  siteKey: z.string().min(8),
  url: z.string().url(),
  referrer: z.string().url().optional(),
  topN: z.number().int().min(1).max(20).optional(),
});

export const RecommendationsResponseSchema = z.object({
  results: z.array(
    z.object({
      url: z.string().url(),
      title: z.string().optional(),
      snippet: z.string().optional(),
      score: z.number(),
    })
  ),
});

export type RecommendationsRequest = z.infer<typeof RecommendationsRequestSchema>;
export type RecommendationsResponse = z.infer<typeof RecommendationsResponseSchema>;


