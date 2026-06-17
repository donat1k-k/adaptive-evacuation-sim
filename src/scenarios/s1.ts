// S1 — Simple baseline (SPEC §17). Контрольный сценарий: открытая комната, два
// широких выхода, низкая плотность, без динамических событий. Цель — проверить
// базовую корректность и получить baseline, на котором A1/A2/A4 ведут себя близко
// (нет узких мест, нет блокировок, density-cost A4 пренебрежимо мал).
// Данные, без редактора карт. Не зависит от React.
import type { ExitSpec, Scenario, Seed } from '../models/index.ts'
import { buildEnvironmentMap, rectStartZone } from './buildMap.ts'

const WIDTH = 11
const HEIGHT = 9

/** Два широких выхода в верхних углах (по 2 клетки) — потоку есть куда разойтись. */
const EXITS: readonly ExitSpec[] = [
  { id: 'exit-l', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
  { id: 'exit-r', cells: [{ x: 9, y: 0 }, { x: 10, y: 0 }] },
]

const DEFAULT_SEED: Seed = 1
const MAX_TICKS = 80

/**
 * S1. Открытая комната 11×9 без стен. Агенты стартуют понятной зоной снизу
 * (y=6..8, x=1..9 → 27 клеток ≥ agentCount). Без событий — статический baseline.
 */
export const s1Scenario: Scenario = {
  id: 's1-baseline',
  name: 'S1 — Simple baseline',
  description:
    'Контрольный сценарий: открытая комната 11×9, два широких выхода в верхних ' +
    'углах, 12 агентов низкой плотности, без динамических событий. Baseline для ' +
    'проверки корректности; A1/A2/A4 ожидаемо ведут себя близко.',
  version: '1.0.0',
  map: buildEnvironmentMap({
    width: WIDTH,
    height: HEIGHT,
    walls: [],
    exits: EXITS,
    startZones: [rectStartZone('start', 1, 9, 6, 8)],
  }),
  agentCount: 12,
  events: [],
  seed: DEFAULT_SEED,
  maxTicks: MAX_TICKS,
}
