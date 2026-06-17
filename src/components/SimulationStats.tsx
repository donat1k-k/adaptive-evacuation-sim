// Счётчики и базовые метрики прогона (E4 + метрики E7). Только отображение
// значений из снимка-кадра; расчёт метрик — в src/metrics (headless).
import type { SimulationStatus } from '../simulation/index.ts'

interface SimulationStatsProps {
  readonly tick: number
  readonly status: SimulationStatus
  readonly total: number
  readonly evacuated: number
  readonly onMap: number
  /** Метрики E7. */
  readonly algorithmLabel: string
  readonly evacuatedPercent: number
  readonly totalReroutes: number
  readonly meanEvacuationTime: number | null
  readonly blockedOrStuckCount: number
}

export function SimulationStats({
  tick,
  status,
  total,
  evacuated,
  onMap,
  algorithmLabel,
  evacuatedPercent,
  totalReroutes,
  meanEvacuationTime,
  blockedOrStuckCount,
}: SimulationStatsProps) {
  return (
    <dl className="sim-stats">
      <div>
        <dt>Алгоритм</dt>
        <dd>{algorithmLabel}</dd>
      </div>
      <div>
        <dt>Tick</dt>
        <dd>{tick}</dd>
      </div>
      <div>
        <dt>Статус</dt>
        <dd>{status === 'running' ? 'running' : 'done'}</dd>
      </div>
      <div>
        <dt>Агентов всего</dt>
        <dd>{total}</dd>
      </div>
      <div>
        <dt>Эвакуировано</dt>
        <dd>
          {evacuated} / {total} ({evacuatedPercent}%)
        </dd>
      </div>
      <div>
        <dt>На карте</dt>
        <dd>{onMap}</dd>
      </div>
      <div>
        <dt>Blocked/stuck</dt>
        <dd>{blockedOrStuckCount}</dd>
      </div>
      <div>
        <dt>Reroutes (всего)</dt>
        <dd>{totalReroutes}</dd>
      </div>
      <div>
        <dt>Среднее время</dt>
        <dd>{meanEvacuationTime === null ? '—' : meanEvacuationTime.toFixed(1)}</dd>
      </div>
    </dl>
  )
}
