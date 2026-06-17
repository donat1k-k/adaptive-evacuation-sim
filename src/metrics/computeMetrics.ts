// Расчёт итоговых метрик прогона (SPEC §13–14, §19). Этап E7.
// ЧИСТЫЙ headless-слой: считает метрики из финального SimulationState ПОСЛЕ run().
// НЕ зависит от React, НЕ участвует в movement/conflict/events и НЕ меняет логику
// симуляции — только читает состояние. Время эвакуации считается ТОЛЬКО по
// эвакуированным (SPEC §14); процент эвакуации отчитывается всегда рядом.
import type {
  Agent,
  AgentResult,
  EvacuationCurvePoint,
  ExitId,
  ExitLoad,
  SimulationMetrics,
} from '../models/index.ts'
import type { SimulationState } from '../simulation/index.ts'
import { coordKey } from '../utils/geometry.ts'

/** coordKey клетки выхода → id выхода (для определения, через какой выход вышел агент). */
function exitIdByCellKey(state: SimulationState): Map<string, ExitId> {
  const map = new Map<string, ExitId>()
  for (const exit of state.map.exits) {
    for (const c of exit.cells) map.set(coordKey(c), exit.id)
  }
  return map
}

/**
 * Итог по одному агенту. exitUsed — выход, на клетке которого агент стоит (для
 * эвакуированных pos = клетка выхода, т.к. движок снимает occupancy, но pos
 * оставляет). evacuationTime = tEvacuated − tStart (null, если не вышел).
 */
export function computeAgentResults(state: SimulationState): AgentResult[] {
  const exitByKey = exitIdByCellKey(state)
  return state.agents.map((a: Agent): AgentResult => {
    const evacuated = a.state === 'evacuated'
    const evacuationTime = a.tEvacuated !== null ? a.tEvacuated - a.tStart : null
    const exitUsed = evacuated ? exitByKey.get(coordKey(a.pos)) ?? null : null
    return {
      id: a.id,
      algorithm: a.algorithm,
      evacuated,
      tEvacuated: a.tEvacuated,
      tStart: a.tStart,
      evacuationTime,
      reroutes: a.reroutes,
      exitUsed,
      finalState: a.state,
    }
  })
}

/**
 * Кривая эвакуации (SPEC §19): для каждого тика 0..finishedTick — сколько агентов
 * уже эвакуировано (tEvacuated ≤ tick) и их доля. Монотонно неубывающая по
 * построению. Считается из tEvacuated, без пер-тикового состояния движка.
 */
function buildEvacuationCurve(results: readonly AgentResult[], finishedTick: number, total: number): EvacuationCurvePoint[] {
  const evacTicks: number[] = []
  for (const r of results) if (r.tEvacuated !== null) evacTicks.push(r.tEvacuated)
  const curve: EvacuationCurvePoint[] = []
  for (let tick = 0; tick <= finishedTick; tick++) {
    let count = 0
    for (const t of evacTicks) if (t <= tick) count++
    curve.push({ tick, evacuatedCount: count, evacuatedFraction: total === 0 ? 0 : count / total })
  }
  return curve
}

/** Нагрузка на каждый выход: сколько эвакуированных вышло через него (включая 0). */
function buildExitLoads(state: SimulationState, results: readonly AgentResult[]): ExitLoad[] {
  const counts = new Map<ExitId, number>()
  for (const exit of state.map.exits) counts.set(exit.id, 0)
  for (const r of results) {
    if (r.exitUsed === null) continue
    counts.set(r.exitUsed, (counts.get(r.exitUsed) ?? 0) + 1)
  }
  return state.map.exits.map((e) => ({ exitId: e.id, evacuatedCount: counts.get(e.id) ?? 0 }))
}

/**
 * Агрегированные метрики прогона из финального состояния. Корректно обрабатывает:
 * 0 агентов (доли/средние → 0/null, без NaN), никто не вышел (время → null),
 * все вышли, частичную эвакуацию (strandedCount = не вышедшие, SPEC §14).
 */
export function computeMetrics(state: SimulationState): SimulationMetrics {
  const results = computeAgentResults(state)
  const finishedTick = state.tick
  const total = results.length

  const evacTimes: number[] = []
  let evacuatedCount = 0
  let totalReroutes = 0
  let blockedOrStuckCount = 0
  let makespan: number | null = null
  for (const r of results) {
    totalReroutes += r.reroutes
    if (r.evacuated && r.evacuationTime !== null && r.tEvacuated !== null) {
      evacuatedCount++
      evacTimes.push(r.evacuationTime)
      if (makespan === null || r.tEvacuated > makespan) makespan = r.tEvacuated
    } else if (r.finalState === 'blocked' || r.finalState === 'stuck') {
      blockedOrStuckCount++
    }
  }

  const hasEvac = evacTimes.length > 0
  const sum = evacTimes.reduce((acc, t) => acc + t, 0)

  return {
    makespan,
    meanEvacuationTime: hasEvac ? sum / evacTimes.length : null,
    minEvacuationTime: hasEvac ? Math.min(...evacTimes) : null,
    maxEvacuationTime: hasEvac ? Math.max(...evacTimes) : null,
    finishedTick,
    totalAgents: total,
    evacuatedCount,
    evacuatedFraction: total === 0 ? 0 : evacuatedCount / total,
    strandedCount: total - evacuatedCount,
    blockedOrStuckCount,
    exitLoads: buildExitLoads(state, results),
    totalReroutes,
    meanReroutes: total === 0 ? 0 : totalReroutes / total,
    // Плотность по всему прогону требует пер-тикового сбора в движке — не входит
    // в минимальный E7 (движок не меняем). Подключение — позже (Strong, SPEC §13).
    meanDensity: null,
    maxDensity: null,
    evacuationCurve: buildEvacuationCurve(results, finishedTick, total),
  }
}
