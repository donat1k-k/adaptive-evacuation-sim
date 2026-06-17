// src/comparison — headless comparison runner (этап E9): scenario × algorithm ×
// seed(s) + агрегация. НЕ зависит от React. Public API — отсюда.
export { runScenarioComparison, seedRange } from './runComparison.ts'
export type { ComparisonOptions, ConfigFactory } from './runComparison.ts'
export { aggregateRuns } from './aggregate.ts'
export type { RunResult, AggregateSummary, ComparisonResult, ComparisonMetadata } from './types.ts'

// Sanity-проверки (экспортируемые хелперы, НЕ авто-suite).
export { runComparisonSelfChecks } from './selftest.ts'
export type { ComparisonSelfCheckResult } from './selftest.ts'
