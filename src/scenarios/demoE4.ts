// Демо-сценарий для базовой визуализации E4 (PLAN §3 E4).
// ВАЖНО: это НЕ финальные исследовательские сценарии S1–S3 (этап E8). Цель —
// небольшая понятная карта, на которой видно работу headless-движка и реакцию
// среды на событие block-exit. Движение в E4 обеспечивает временная
// StubGreedyPolicy (E3), а не настоящие алгоритмы A1/A2/A4. Типизирован моделями E2.
import type {
  AlgorithmId,
  CellType,
  Coordinate,
  EnvironmentMap,
  ExitSpec,
  Scenario,
  SimulationConfig,
  StartZone,
  Seed,
} from '../models/index.ts'
import { coordKey } from '../utils/geometry.ts'

const WIDTH = 12
const HEIGHT = 8

/** Два угловых выхода (ширина 1 клетка каждый). */
const EXITS: readonly ExitSpec[] = [
  { id: 'exit-left', cells: [{ x: 0, y: 0 }] },
  { id: 'exit-right', cells: [{ x: 11, y: 0 }] },
]

/** Несколько одиночных стен-препятствий в центре (не сплошной барьер). */
const WALLS: readonly Coordinate[] = [
  { x: 5, y: 3 },
  { x: 6, y: 3 },
  { x: 5, y: 4 },
  { x: 6, y: 4 },
]

/** Стартовая зона снизу: y=6,7 × x=2..9 → 16 уникальных клеток (≥ agentCount). */
function makeStartZone(): StartZone {
  const cells: Coordinate[] = []
  for (let y = 6; y <= 7; y++) {
    for (let x = 2; x <= 9; x++) cells.push({ x, y })
  }
  return { id: 'start', cells }
}

/** Построить карту 12×8: пол всюду, заданные стены и клетки-выходы. */
function buildMap(): EnvironmentMap {
  const wallKeys = new Set(WALLS.map(coordKey))
  const exitKeys = new Set(EXITS.flatMap((e) => e.cells.map(coordKey)))
  const cells: CellType[][] = []
  for (let y = 0; y < HEIGHT; y++) {
    const row: CellType[] = []
    for (let x = 0; x < WIDTH; x++) {
      const key = coordKey({ x, y })
      row.push(exitKeys.has(key) ? 'exit' : wallKeys.has(key) ? 'wall' : 'floor')
    }
    cells.push(row)
  }
  return {
    size: { width: WIDTH, height: HEIGHT },
    cells,
    exits: EXITS,
    startZones: [makeStartZone()],
    hazardZones: [],
  }
}

const DEFAULT_SEED: Seed = 12345
const MAX_TICKS = 80

/**
 * Демо-сценарий E4. Событие block-exit на тике 6 закрывает правый выход:
 * после этого открытым остаётся только левый, и stub-policy выбирает доступный
 * локальный ход с учётом текущего состояния blocked cells/exits (это НЕ
 * адаптивная маршрутизация и не финальный алгоритм).
 */
export const demoE4Scenario: Scenario = {
  id: 'demo-e4',
  name: 'E4 demo',
  description:
    'Демонстрационная карта для базовой визуализации E4 (не финальные S1–S3). ' +
    'Два угловых выхода, центральные препятствия, событие block-exit на тике 6.',
  version: '0.1.0',
  map: buildMap(),
  agentCount: 8,
  events: [{ type: 'block-exit', exitId: 'exit-right', tick: 6 }],
  seed: DEFAULT_SEED,
  maxTicks: MAX_TICKS,
}

/**
 * Конфиг прогона для демо (E5). `algorithm` выбирается в UI; коэффициенты A4 —
 * ЧЕРНОВЫЕ (подбор и выводы — E12, DECISIONS). δ·exitLoad не используется (=0).
 * Для A1/A2 веса A4 игнорируются. Это демонстрационный конфиг, НЕ исследовательский.
 */
export function createDemoE4Config(
  algorithm: AlgorithmId = 'nearest-exit',
  seed: Seed = DEFAULT_SEED,
): SimulationConfig {
  return {
    algorithm,
    seed,
    maxTicks: MAX_TICKS,
    // Черновые коэффициенты A4: base + α·density + β·danger + γ·smoke; δ(exitLoad)=0.
    adaptiveWeights: { base: 1, densityWeight: 0.8, dangerWeight: 6, smokeWeight: 3, exitLoadWeight: 0 },
    rerouteThresholds: { densityThreshold: 2, exitLoadThreshold: 0, revisionPeriod: 5 },
    densityRadius: 1,
    stuckThreshold: 5,
    conflict: { allowChaining: false },
  }
}
