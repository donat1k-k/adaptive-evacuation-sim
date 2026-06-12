// Демо-визуализация headless-движка (этап E4). Композиция: контроллер +
// статистика + контролы + сетка. Намеренно debug-уровня (PLAN §3 E4): цель —
// увидеть работу движка, а не финальный дизайн.
//
// ВАЖНО: движением управляет StubGreedyPolicy — ВРЕМЕННАЯ demo-policy E3/E4,
// а НЕ алгоритмы A1/A2/A4 и НЕ адаптивная маршрутизация. Настоящие алгоритмы — E5.
import { useMemo } from 'react'
import { demoE4Scenario, createDemoE4Config } from '../scenarios/index.ts'
import { useSimulationDemo } from './useSimulationDemo.ts'
import { GridView } from './GridView.tsx'
import { SimulationControls } from './SimulationControls.tsx'
import { SimulationStats } from './SimulationStats.tsx'
import './SimulationDemo.css'

export function SimulationDemo() {
  const config = useMemo(() => createDemoE4Config(), [])
  const { frame, map, playing, policyName, reset, step, run10, togglePlay } = useSimulationDemo(
    demoE4Scenario,
    config,
  )

  return (
    <section className="sim-demo">
      <h2>Демо-визуализация движка (E4)</h2>

      <p className="sim-demo-note">
        Базовая отладочная визуализация headless-движка. Движением агентов
        управляет <strong>StubGreedyPolicy</strong> — временная demo-policy этапов
        E3/E4, <strong>не</strong> алгоритмы A1/A2/A4 и <strong>не</strong>{' '}
        адаптивная маршрутизация. После события <code>block-exit</code> (тик 6)
        demo-policy просто выбирает доступный локальный ход с учётом текущих
        заблокированных клеток и выходов. Настоящие алгоритмы — этап E5.
      </p>

      <SimulationStats
        tick={frame.tick}
        status={frame.status}
        total={frame.total}
        evacuated={frame.evacuated}
        onMap={frame.onMap}
      />

      <SimulationControls
        playing={playing}
        done={frame.status === 'done'}
        onReset={reset}
        onStep={step}
        onRun10={run10}
        onTogglePlay={togglePlay}
      />

      <GridView
        map={map}
        agents={frame.agents}
        blockedKeys={frame.blockedKeys}
        hazardKeys={frame.hazardKeys}
      />

      <ul className="sim-legend">
        <li>
          <span className="legend-swatch cell-floor" /> пол
        </li>
        <li>
          <span className="legend-swatch cell-wall" /> стена
        </li>
        <li>
          <span className="legend-swatch cell-exit" /> выход
        </li>
        <li>
          <span className="legend-swatch cell-blocked" /> заблокировано
        </li>
        <li>
          <span className="legend-swatch cell-hazard" /> hazard
        </li>
        <li>
          <span className="legend-swatch legend-agent" /> агент
        </li>
      </ul>

      <p className="sim-demo-policy">
        Активная policy: <code>{policyName}</code> (временная, не финальный алгоритм).
      </p>
    </section>
  )
}
