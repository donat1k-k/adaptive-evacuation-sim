// Реестр финальных исследовательских сценариев S1–S3 (этап E8).
// demoE4 НАМЕРЕННО сюда не входит — это отладочный демо-сценарий E4, не
// исследовательский (см. demoE4.ts). Не зависит от React.
import type { Scenario, ScenarioId } from '../models/index.ts'
import { s1Scenario } from './s1.ts'
import { s2Scenario } from './s2.ts'
import { s3Scenario } from './s3.ts'

/** Упорядоченный список финальных сценариев (S1, S2, S3). */
export const FINAL_SCENARIOS: readonly Scenario[] = [s1Scenario, s2Scenario, s3Scenario]

/** Сценарий по id (или undefined). */
export function getScenarioById(id: ScenarioId): Scenario | undefined {
  return FINAL_SCENARIOS.find((s) => s.id === id)
}
