import { z } from 'zod';
import {
  validateSummaryStructure,
  enforceRedFlagConsistency,
  checkHallucinations,
} from './guardrails';
import { AggregatedClinicalContext } from '@medikiosk/shared-types';

describe('AI Guardrails', () => {
  describe('validateSummaryStructure', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('returns success for valid data', () => {
      const result = validateSummaryStructure(schema, { name: 'John', age: 30 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John');
      }
    });

    it('returns errors for structurally invalid data', () => {
      const result = validateSummaryStructure(schema, { name: 'John' }); // missing age
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Required');
      }
    });
  });

  describe('enforceRedFlagConsistency', () => {
    const deterministicFlags: any[] = [
      { type: 'CHEST_PAIN', severity: 'EMERGENCY' },
      { type: 'FEVER', severity: 'WARNING' },
    ];

    it('overrides LLM downgraded red flag', () => {
      const llmFlags: any[] = [
        { type: 'CHEST_PAIN', severity: 'WARNING' }, // Downgraded
        { type: 'FEVER', severity: 'WARNING' },
      ];

      const { finalRedFlags, finalRiskLevel, mismatches } = enforceRedFlagConsistency(
        llmFlags,
        deterministicFlags,
        'WARNING', // LLM
        'EMERGENCY' // Det
      );

      expect(finalRedFlags).toEqual(expect.arrayContaining(deterministicFlags));
      expect(finalRiskLevel).toBe('EMERGENCY');
      expect(mismatches.length).toBeGreaterThan(0);
      expect(mismatches).toContain('LLM downgraded severity of CHEST_PAIN from EMERGENCY to WARNING');
      expect(mismatches).toContain('LLM downgraded overall risk level from EMERGENCY to WARNING');
    });

    it('keeps additional LLM flags if no conflict', () => {
      const llmFlags: any[] = [
        ...deterministicFlags,
        { type: 'DIZZINESS', severity: 'HIGH_PRIORITY' },
      ];

      const { finalRedFlags, finalRiskLevel, mismatches } = enforceRedFlagConsistency(
        llmFlags,
        deterministicFlags,
        'HIGH_PRIORITY',
        'EMERGENCY'
      );

      expect(finalRedFlags).toHaveLength(3);
      expect(finalRiskLevel).toBe('EMERGENCY'); // deterministic stays higher
      expect(mismatches).toHaveLength(1);
    });
  });

  describe('checkHallucinations', () => {
    const context = {
      medications: [{ name: 'Paracetamol' }],
      investigations: [{ name: 'Hemoglobin' }],
      allergies: [],
    } as unknown as AggregatedClinicalContext;

    it('passes when all mentioned entities exist', () => {
      const hallucinations = checkHallucinations(
        ['paracetamol'],
        ['hemoglobin'],
        [],
        context
      );
      expect(hallucinations).toHaveLength(0);
    });

    it('flags hallucinated medication', () => {
      const hallucinations = checkHallucinations(
        ['Aspirin'],
        ['hemoglobin'],
        [],
        context
      );
      expect(hallucinations).toHaveLength(1);
      expect(hallucinations[0]).toContain('Hallucinated medication referenced: Aspirin');
    });
  });
});
