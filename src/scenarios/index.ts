// src/scenarios — готовые сценарии как данные. Не зависит от React.
//  • Финальные исследовательские сценарии S1–S3 (этап E8): s1/s2/s3 + реестр.
//  • Общий конфиг прогона сценария (createScenarioConfig).
//  • Демо-сценарий E4 (demoE4) — ОТЛАДОЧНЫЙ, не исследовательский (не в реестре).
export { s1Scenario } from './s1.ts'
export { s2Scenario } from './s2.ts'
export { s3Scenario } from './s3.ts'
export { FINAL_SCENARIOS, getScenarioById } from './registry.ts'
export { createScenarioConfig } from './config.ts'
export { buildEnvironmentMap, rectStartZone } from './buildMap.ts'
export type { MapSpec } from './buildMap.ts'

// Sanity-проверки сценариев (экспортируемые хелперы, НЕ авто-suite — как E3/E5/E6/E7).
export { runScenarioSelfChecks } from './selftest.ts'
export type { ScenarioSelfCheckResult } from './selftest.ts'

// Демо-сценарий E4 (отладочный).
export { demoE4Scenario, createDemoE4Config } from './demoE4.ts'
