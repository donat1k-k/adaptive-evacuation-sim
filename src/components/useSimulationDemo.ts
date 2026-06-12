// Контроллер демо-симуляции для UI (этап E4). UI-слой: импортирует React и
// headless-движок, но НЕ наоборот — ядро (src/simulation) React не импортирует.
//
// Движок мутирует SimulationState на месте (стабильная ссылка), поэтому React не
// увидит изменений сам. Контроллер держит движок в ref и после каждого действия
// строит ИММУТАБЕЛЬНЫЙ снимок-кадр (readFrame) → useState → ре-рендер.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AgentId,
  AgentState,
  AlgorithmId,
  Coordinate,
  EnvironmentMap,
  Scenario,
  SimulationConfig,
} from '../models/index.ts'
import { SimulationEngine } from '../simulation/index.ts'
import type { SimulationState, SimulationStatus } from '../simulation/index.ts'
import { createPolicy } from '../algorithms/index.ts'
import { coordKey } from '../utils/index.ts'

/** Один агент в снимке (только для отрисовки). */
export interface FrameAgent {
  readonly id: AgentId
  readonly pos: Coordinate
  readonly state: AgentState
}

/** Иммутабельный снимок состояния движка для рендера. */
export interface DemoFrame {
  readonly tick: number
  readonly status: SimulationStatus
  /** Не-эвакуированные агенты (эвакуированные на карту не выводятся). */
  readonly agents: readonly FrameAgent[]
  readonly blockedKeys: ReadonlySet<string>
  readonly hazardKeys: ReadonlySet<string>
  readonly total: number
  readonly evacuated: number
  /** Агентов на карте (не эвакуированы). */
  readonly onMap: number
}

/** Построить иммутабельный снимок из текущего состояния движка. */
function readFrame(state: SimulationState): DemoFrame {
  const agents: FrameAgent[] = []
  let evacuated = 0
  for (const a of state.agents) {
    if (a.state === 'evacuated') {
      evacuated++
      continue
    }
    agents.push({ id: a.id, pos: a.pos, state: a.state })
  }
  const hazardKeys = new Set<string>()
  for (const h of state.hazards) for (const c of h.cells) hazardKeys.add(coordKey(c))
  return {
    tick: state.tick,
    status: state.status,
    agents,
    blockedKeys: new Set(state.blockedCells),
    hazardKeys,
    total: state.agents.length,
    evacuated,
    onMap: agents.length,
  }
}

/** Интервал автопрогона (мс). Намеренно медленно — это debug-визуализация. */
const PLAY_INTERVAL_MS = 250

export interface SimulationDemoController {
  readonly frame: DemoFrame
  readonly map: EnvironmentMap
  readonly playing: boolean
  readonly policyName: string
  reset(): void
  step(): void
  run10(): void
  togglePlay(): void
}

/**
 * Хук-контроллер над SimulationEngine. Движением управляет реальный алгоритм E5
 * (A1/A2/A4) через createPolicy(algorithm, config). Компонент-раннер пересоздаётся
 * по key={algorithm} при смене алгоритма, поэтому policy стабильна на время монтирования.
 */
export function useSimulationDemo(
  scenario: Scenario,
  config: SimulationConfig,
  algorithm: AlgorithmId,
): SimulationDemoController {
  const policy = useMemo(() => createPolicy(algorithm, config), [algorithm, config])
  const engineRef = useRef<SimulationEngine | null>(null)

  // Ленивая инициализация движка при первом рендере (engine0 — не-null после if).
  let engine0 = engineRef.current
  if (engine0 === null) {
    engine0 = new SimulationEngine(scenario, config, policy)
    engineRef.current = engine0
  }

  const [frame, setFrame] = useState<DemoFrame>(() => readFrame(engine0.getState()))
  const [playing, setPlaying] = useState(false)

  const reset = useCallback(() => {
    const engine = new SimulationEngine(scenario, config, policy)
    engineRef.current = engine
    setPlaying(false)
    setFrame(readFrame(engine.getState()))
  }, [scenario, config, policy])

  const step = useCallback(() => {
    const engine = engineRef.current
    if (engine === null || engine.isDone()) return
    engine.step()
    setFrame(readFrame(engine.getState()))
  }, [])

  const run10 = useCallback(() => {
    const engine = engineRef.current
    if (engine === null) return
    for (let i = 0; i < 10 && !engine.isDone(); i++) engine.step()
    setFrame(readFrame(engine.getState()))
  }, [])

  const togglePlay = useCallback(() => {
    const engine = engineRef.current
    if (engine === null || engine.isDone()) return
    setPlaying((p) => !p)
  }, [])

  // Автопрогон: интервал живёт только пока playing. StrictMode-safe — cleanup
  // снимает интервал; завершение симуляции останавливает автопрогон.
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      const engine = engineRef.current
      if (engine === null) return
      if (engine.isDone()) {
        setPlaying(false)
        return
      }
      engine.step()
      setFrame(readFrame(engine.getState()))
    }, PLAY_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [playing])

  return {
    frame,
    map: scenario.map,
    playing,
    policyName: policy.name,
    reset,
    step,
    run10,
    togglePlay,
  }
}
