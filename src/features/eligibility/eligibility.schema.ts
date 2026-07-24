/** Zod 스키마 — 1단계 입력 검증. RHF resolver 및 store 복구 검증에 사용. */
import { z } from "zod";

export const memberRelationSchema = z.enum(["SELF", "SPOUSE", "PARENT", "CHILD", "FETUS"]);

export const householdMemberSchema = z.object({
  id: z.string(),
  relation: memberRelationSchema,
});

export const carBandSchema = z.enum(["NONE", "UNDER_4542", "OVER"]);

export const stepASchema = z.object({
  ownSelfHouse: z.boolean(),
  ownMemberHouse: z.boolean(),
  hasRestriction: z.boolean(),
});

export const stepBSchema = z.object({
  birthISO: z
    .string()
    .min(1, "생년월일을 입력해 주세요.")
    .refine((v) => {
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now();
    }, "올바른 생년월일을 입력해 주세요."),
  members: z.array(householdMemberSchema).min(1, "본인은 기본 포함돼요."),
});

export const stepCSchema = z.object({
  incomeBracketIndex: z.number().int().min(0).max(4),
  assetBracketIndex: z.number().int().min(0).max(7),
  carBand: carBandSchema,
});

export const stepDSchema = z.object({
  livesInBusan: z.boolean(),
});

export const commonInputSchema = z.object({
  ownSelfHouse: z.boolean(),
  ownMemberHouse: z.boolean(),
  hasRestriction: z.boolean(),
  birthISO: z.string(),
  ageYears: z.number(),
  members: z.array(householdMemberSchema),
  householdSize: z.number().int().min(1).max(8),
  incomeManwon: z.number(),
  assetManwon: z.number(),
  carBand: carBandSchema,
  livesInBusan: z.boolean(),
});

export type StepAValues = z.infer<typeof stepASchema>;
export type StepBValues = z.infer<typeof stepBSchema>;
export type StepCValues = z.infer<typeof stepCSchema>;
export type StepDValues = z.infer<typeof stepDSchema>;
