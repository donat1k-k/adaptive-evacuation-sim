// Визуализация сетки симуляции (этап E4). Простой CSS-grid рендер: пол, стены,
// выходы, заблокированные клетки, hazard-клетки и агенты. Только отрисовка —
// никакой логики симуляции. Эвакуированные на карту не выводятся (см. счётчик).
import type { AgentState, EnvironmentMap } from '../models/index.ts'
import type { FrameAgent } from './useSimulationDemo.ts'
import { coordKey } from '../utils/index.ts'

interface GridViewProps {
  readonly map: EnvironmentMap
  readonly agents: readonly FrameAgent[]
  readonly blockedKeys: ReadonlySet<string>
  readonly hazardKeys: ReadonlySet<string>
}

/** Короткая метка состояния агента для подсказки/цвета. */
const STATE_LABEL: Record<AgentState, string> = {
  waiting: 'ожидает',
  moving: 'движется',
  evacuated: 'эвакуирован',
  blocked: 'нет хода',
  stuck: 'застрял',
}

const CELL_PX = 34

export function GridView({ map, agents, blockedKeys, hazardKeys }: GridViewProps) {
  const { width, height } = map.size

  // Позиция агента → состояние (для оверлея-точки).
  const agentByKey = new Map<string, AgentState>()
  for (const a of agents) agentByKey.set(coordKey(a.pos), a.state)

  const cells = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = coordKey({ x, y })
      const type = map.cells[y]?.[x] ?? 'floor'
      const isBlocked = blockedKeys.has(key)
      const isHazard = hazardKeys.has(key)
      const agentState = agentByKey.get(key)

      const classNames = ['grid-cell', `cell-${type}`]
      if (isBlocked) classNames.push('cell-blocked')
      if (isHazard) classNames.push('cell-hazard')

      cells.push(
        <div
          key={key}
          className={classNames.join(' ')}
          title={`(${x},${y}) ${type}${isBlocked ? ' [blocked]' : ''}${isHazard ? ' [hazard]' : ''}`}
        >
          {agentState !== undefined && (
            <span className={`agent agent-${agentState}`} title={`агент: ${STATE_LABEL[agentState]}`} />
          )}
        </div>,
      )
    }
  }

  return (
    <div
      className="grid-view"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${width}, ${CELL_PX}px)`,
        gridTemplateRows: `repeat(${height}, ${CELL_PX}px)`,
      }}
    >
      {cells}
    </div>
  )
}
