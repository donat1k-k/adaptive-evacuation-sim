// Реестр политик маршрутизации (E5): по AlgorithmId из конфига → MovementPolicy.
// Фабрика живёт в src/algorithms и вызывается КАЛЛЕРОМ (UI/эксперименты), который
// передаёт policy в SimulationEngine. Движок алгоритмы не импортирует — цикла нет.
// HEADLESS: не зависит от React.
import type { AlgorithmId, SimulationConfig } from '../models/index.ts'
import type { MovementPolicy } from '../simulation/index.ts'
import { NearestExitPolicy } from './nearestExit.ts'
import { ShortestPathAStarPolicy } from './shortestPathAStar.ts'
import { AdaptiveWeightedAStarPolicy } from './adaptiveWeightedAStar.ts'

/**
 * Построить политику движения по алгоритму из конфига. A4 берёт коэффициенты из
 * config.adaptiveWeights / rerouteThresholds / densityRadius. A3
 * (load-aware-exit-distribution) в MVP не реализуется (SPEC §10, §21) → ошибка.
 */
export function createPolicy(algorithm: AlgorithmId, config: SimulationConfig): MovementPolicy {
  const base = config.adaptiveWeights.base
  switch (algorithm) {
    case 'nearest-exit':
      return new NearestExitPolicy(base)
    case 'shortest-path-a-star':
      return new ShortestPathAStarPolicy(base)
    case 'adaptive-weighted-a-star':
      return new AdaptiveWeightedAStarPolicy({
        base,
        densityWeight: config.adaptiveWeights.densityWeight,
        dangerWeight: config.adaptiveWeights.dangerWeight,
        smokeWeight: config.adaptiveWeights.smokeWeight,
        densityRadius: config.densityRadius,
        densityThreshold: config.rerouteThresholds.densityThreshold,
        revisionPeriod: config.rerouteThresholds.revisionPeriod,
      })
    case 'load-aware-exit-distribution':
      throw new Error(
        'createPolicy: A3 (load-aware-exit-distribution) не реализуется в MVP (SPEC §10, §21). ' +
          'Доступны: nearest-exit (A1), shortest-path-a-star (A2), adaptive-weighted-a-star (A4).',
      )
  }
}
