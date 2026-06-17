// Конфиг прогона для финальных сценариев S1–S3 (этап E8/E9).
// Один общий фабричный конфиг: maxTicks берётся из сценария, коэффициенты A4 —
// ЧЕРНОВЫЕ (подбор и выводы — E12, DECISIONS). δ·exitLoad не используется (=0).
// Для A1/A2 веса A4 игнорируются. Не зависит от React.
import type { AlgorithmId, Scenario, SimulationConfig, Seed } from '../models/index.ts'

/**
 * Базовый конфиг прогона сценария. Параметры (кроме исследуемого алгоритма)
 * держатся общими для всех сценариев — это контролируемые переменные (SPEC §16):
 * одинаковые правила движения и параметры A4 для честного сравнения.
 */
export function createScenarioConfig(
  scenario: Scenario,
  algorithm: AlgorithmId,
  seed: Seed = scenario.seed,
): SimulationConfig {
  return {
    algorithm,
    seed,
    maxTicks: scenario.maxTicks,
    // Черновые коэффициенты A4: base + α·density + β·danger + γ·smoke; δ(exitLoad)=0.
    adaptiveWeights: { base: 1, densityWeight: 0.8, dangerWeight: 6, smokeWeight: 3, exitLoadWeight: 0 },
    rerouteThresholds: { densityThreshold: 2, exitLoadThreshold: 0, revisionPeriod: 5 },
    densityRadius: 1,
    stuckThreshold: 5,
    conflict: { allowChaining: false },
  }
}
