// src/metrics — расчёт метрик прогона (SPEC §13–14, §19). Этап E7.
// Чистый headless-слой над финальным SimulationState; время — только по
// эвакуированным, % эвакуации всегда рядом. НЕ зависит от React. Public API — отсюда.
export { computeMetrics, computeAgentResults } from './computeMetrics.ts'

// Sanity-проверки метрик (экспортируемые хелперы, НЕ авто-suite — как E3/E5/E6).
export { runMetricsSelfChecks } from './selftest.ts'
export type { MetricsSelfCheckResult } from './selftest.ts'
