// src/simulation — ядро симуляции (тики, движение, разрешение конфликтов, события, ГПСЧ).
// Этап E3. HEADLESS: НЕ зависит от React; прогоняется «вхолостую» для серий (SPEC §24).
// Public API движка — импортировать отсюда.

// Движок
export { SimulationEngine } from './SimulationEngine.ts'

// Состояние прогона
export type { SimulationState, SimulationStatus, ActiveHazard } from './state.ts'
export { isPassable, openExitCellKeys, SIMULATION_STATUSES } from './state.ts'

// ГПСЧ (детерминизм по seed)
export { createRng } from './rng.ts'
export type { Rng } from './rng.ts'

// Политика движения (шов для алгоритмов E5; в E3 — временная заглушка)
export type { MovementPolicy } from './policy.ts'
export { StubGreedyPolicy } from './policy.ts'

// Разрешение конфликтов и события (низкоуровневые помощники)
export { resolveConflicts } from './conflict.ts'
export type { Intents } from './conflict.ts'
export { applyDueEvents, sortEvents } from './events.ts'

// Sanity-проверки (экспортируемые хелперы, НЕ авто-запускаемый suite)
export { runSimulationSelfChecks } from './selftest.ts'
export type { SelfCheckResult } from './selftest.ts'
