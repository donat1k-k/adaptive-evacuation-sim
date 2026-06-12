// src/components — UI-компоненты (отрисовка сетки, контролы, статистика).
// Только отрисовка и команды движку, без логики симуляции (этап E4+, PLAN §3 E4).
export { SimulationDemo } from './SimulationDemo.tsx'
export { GridView } from './GridView.tsx'
export { SimulationControls } from './SimulationControls.tsx'
export { SimulationStats } from './SimulationStats.tsx'
export { useSimulationDemo } from './useSimulationDemo.ts'
export type { DemoFrame, FrameAgent, SimulationDemoController } from './useSimulationDemo.ts'
