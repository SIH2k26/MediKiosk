import { z } from 'zod';
import { AggregatedClinicalContext, RedFlag } from '@medikiosk/shared-types';

/**
 * Validates the structure of the LLM output against the Zod schema.
 */
export function validateSummaryStructure<T>(
  schema: z.ZodType<T>,
  data: any
): { success: true; data: T } | { success: false; errors: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errorMessages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, errors: errorMessages };
  }
}

/**
 * Compares the LLM's red flags against the deterministic red flags computed by ai-history.
 * Deterministic flags always win.
 */
export function enforceRedFlagConsistency(
  llmRedFlags: RedFlag[],
  deterministicRedFlags: RedFlag[],
  llmRiskLevel: string,
  deterministicRiskLevel: string
): { finalRedFlags: RedFlag[]; finalRiskLevel: string; mismatches: string[] } {
  const mismatches: string[] = [];
  const finalRedFlags = [...deterministicRedFlags];

  deterministicRedFlags.forEach((detFlag) => {
    const llmFlag = llmRedFlags.find((lf) => lf.type === detFlag.type);
    if (!llmFlag) {
      mismatches.push(`LLM omitted deterministic red flag: ${detFlag.type}`);
    } else if (llmFlag.severity !== detFlag.severity) {
      mismatches.push(`LLM downgraded severity of ${detFlag.type} from ${detFlag.severity} to ${llmFlag.severity}`);
    }
  });

  const severityRank = { NORMAL: 0, WARNING: 1, HIGH_PRIORITY: 2, EMERGENCY: 3 };
  let finalRiskLevel = deterministicRiskLevel;

  const detRank = severityRank[deterministicRiskLevel as keyof typeof severityRank] || 0;
  const llmRank = severityRank[llmRiskLevel as keyof typeof severityRank] || 0;

  if (llmRank < detRank) {
    mismatches.push(`LLM downgraded overall risk level from ${deterministicRiskLevel} to ${llmRiskLevel}`);
    finalRiskLevel = deterministicRiskLevel;
  } else if (llmRank > detRank) {
    finalRiskLevel = llmRiskLevel;
  }

  llmRedFlags.forEach((llmFlag) => {
    const exists = finalRedFlags.some((df) => df.type === llmFlag.type);
    if (!exists) {
      finalRedFlags.push(llmFlag);
    }
  });

  return { finalRedFlags, finalRiskLevel, mismatches };
}

/**
 * Checks for hallucinated medications, investigations, and allergies.
 * Expects the LLM to provide a list of entities it explicitly mentioned in the summary,
 * which we cross-reference against the aggregated context.
 */
export function checkHallucinations(
  mentionedMedications: string[],
  mentionedInvestigations: string[],
  mentionedAllergies: string[],
  context: AggregatedClinicalContext
): string[] {
  const hallucinations: string[] = [];

  const contextMeds = context.medications.map((m) => m.name.toLowerCase());
  const contextInvs = context.investigations.map((i) => i.name.toLowerCase());
  const contextAllergies = context.allergies.map((a) => a.substance.toLowerCase());

  mentionedMedications.forEach((med) => {
    if (!contextMeds.some((cm) => cm.includes(med.toLowerCase()) || med.toLowerCase().includes(cm))) {
      hallucinations.push(`Hallucinated medication referenced: ${med}`);
    }
  });

  mentionedInvestigations.forEach((inv) => {
    if (!contextInvs.some((ci) => ci.includes(inv.toLowerCase()) || inv.toLowerCase().includes(ci))) {
      hallucinations.push(`Hallucinated investigation referenced: ${inv}`);
    }
  });

  mentionedAllergies.forEach((allergy) => {
    if (!contextAllergies.some((ca) => ca.includes(allergy.toLowerCase()) || allergy.toLowerCase().includes(ca))) {
      hallucinations.push(`Hallucinated allergy referenced: ${allergy}`);
    }
  });

  return hallucinations;
}
