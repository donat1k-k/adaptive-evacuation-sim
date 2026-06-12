// Применение динамических событий среды (SPEC §9). В E3 — базово:
// block-cell и block-exit делают клетки непроходимыми; hazard-appear копится
// в state.hazards без влияния на движение (полное влияние — Strong Version).
// Headless, не зависит от React.
import type { DynamicEvent } from '../models/index.ts'
import type { SimulationState } from './state.ts'
import { coordKey } from '../utils/geometry.ts'

/**
 * Стабильный ключ события для детерминированной сортировки — чтобы порядок
 * применения не зависел от порядка массива (важно при будущем редактировании
 * сценариев). По типу + содержимому события.
 */
function eventStableKey(e: DynamicEvent): string {
  switch (e.type) {
    case 'block-cell':
      return `block-cell|${e.cells.map(coordKey).join(';')}`
    case 'block-exit':
      return `block-exit|${e.exitId}`
    case 'hazard-appear':
      return `hazard-appear|${e.cells.map(coordKey).join(';')}`
  }
}

/**
 * Детерминированный порядок событий: по тику срабатывания, затем по стабильному
 * ключу. Возвращает новый отсортированный массив (исходный не мутируется).
 */
export function sortEvents(events: readonly DynamicEvent[]): DynamicEvent[] {
  return [...events].sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick
    const ka = eventStableKey(a)
    const kb = eventStableKey(b)
    return ka < kb ? -1 : ka > kb ? 1 : 0
  })
}

/** Применить одно событие к состоянию среды. */
function applyEvent(state: SimulationState, e: DynamicEvent): void {
  switch (e.type) {
    case 'block-cell': {
      for (const c of e.cells) state.blockedCells.add(coordKey(c))
      return
    }
    case 'block-exit': {
      state.blockedExits.add(e.exitId)
      // Клетки закрытого выхода становятся непроходимыми.
      const exit = state.map.exits.find((x) => x.id === e.exitId)
      if (exit) for (const c of exit.cells) state.blockedCells.add(coordKey(c))
      return
    }
    case 'hazard-appear': {
      state.hazards.push({ cells: e.cells, danger: e.danger, smoke: e.smoke })
      return
    }
  }
}

/**
 * Применить все события, чей тик наступил (event.tick ≤ state.tick), и удалить их
 * из очереди. pendingEvents предполагается уже отсортированным (sortEvents при init).
 */
export function applyDueEvents(state: SimulationState): void {
  if (state.pendingEvents.length === 0) return
  const remaining: DynamicEvent[] = []
  for (const e of state.pendingEvents) {
    if (e.tick <= state.tick) applyEvent(state, e)
    else remaining.push(e)
  }
  state.pendingEvents = remaining
}
