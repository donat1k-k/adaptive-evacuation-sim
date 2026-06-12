// src/models — типы данных проекта (среда, агент, алгоритм, событие, сценарий,
// конфиг, метрики, воспроизводимость). Пассивные данные, без логики поведения.
// Public API моделей — импортировать отсюда (см. docs/PROJECT_PLAN.md §3 E2).

export * from './grid.ts'
export * from './agent.ts'
export * from './algorithm.ts'
export * from './event.ts'
export * from './scenario.ts'
export * from './simulation.ts'
export * from './metrics.ts'
export * from './reproducibility.ts'
