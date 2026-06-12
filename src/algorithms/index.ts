// src/algorithms — алгоритмы маршрутизации A1 / A2 / A4 за единым интерфейсом
// (MovementPolicy) + общий A*. Этап E5. Реализуют шов src/simulation/policy.ts;
// НЕ импортируют React (инвариант headless, SPEC §24). Public API — отсюда.

// Фабрика политик по AlgorithmId (основная точка входа для UI/экспериментов).
export { createPolicy } from './createPolicy.ts'

// Политики (A1/A2/A4).
export { NearestExitPolicy } from './nearestExit.ts'
export { ShortestPathAStarPolicy } from './shortestPathAStar.ts'
export { AdaptiveWeightedAStarPolicy } from './adaptiveWeightedAStar.ts'
export type { AdaptiveParams } from './adaptiveWeightedAStar.ts'

// Общая основа поиска пути (переиспользуема метриками/будущими алгоритмами).
export { aStar } from './pathfinding.ts'
export type { AStarParams, AStarPath } from './pathfinding.ts'

// Общие хелперы маршрутизации.
export {
  RoutingPolicyBase,
  collectOpenExits,
  openCellsOfExit,
  chooseExitByManhattan,
  routeHeadUsable,
  buildDensityField,
  buildHazardField,
  exitOwnerOfPath,
} from './routingShared.ts'
export type { OpenExits, RoutePlan, HazardValue } from './routingShared.ts'

// Sanity-проверки алгоритмов (экспортируемые хелперы, НЕ авто-suite — как E3).
export { runAlgorithmSelfChecks } from './selftest.ts'
export type { AlgorithmSelfCheckResult } from './selftest.ts'
