// Счётчики прогона симуляции (этап E4). Только отображение значений из снимка.
import type { SimulationStatus } from '../simulation/index.ts'

interface SimulationStatsProps {
  readonly tick: number
  readonly status: SimulationStatus
  readonly total: number
  readonly evacuated: number
  readonly onMap: number
}

export function SimulationStats({ tick, status, total, evacuated, onMap }: SimulationStatsProps) {
  return (
    <dl className="sim-stats">
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
        <dd>{evacuated}</dd>
      </div>
      <div>
        <dt>На карте</dt>
        <dd>{onMap}</dd>
      </div>
    </dl>
  )
}
