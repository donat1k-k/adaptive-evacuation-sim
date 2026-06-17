// Демо-визуализация headless-движка (этап E4 + селектор алгоритма E5).
// Намеренно debug-уровня (PLAN §3 E4): цель — увидеть работу движка и различие
// алгоритмов, а не финальный дизайн.
//
// ВАЖНО (E5): движением управляет выбранный реальный алгоритм A1/A2/A4 через
// createPolicy. НО demo-сценарий demoE4 — отладочная карта, НЕ финальный
// эксперимент (S1–S3 — E8, метрики — E7). Делать исследовательские выводы по этому
// демо нельзя.
import { useMemo, useState } from 'react'
import { MVP_ALGORITHMS } from '../models/index.ts'
import type { MvpAlgorithmId } from '../models/index.ts'
import { demoE4Scenario, createDemoE4Config } from '../scenarios/index.ts'
import { useSimulationDemo } from './useSimulationDemo.ts'
import { GridView } from './GridView.tsx'
import { SimulationControls } from './SimulationControls.tsx'
import { SimulationStats } from './SimulationStats.tsx'
import './SimulationDemo.css'

/** Человекочитаемые подписи алгоритмов MVP для селектора. */
const ALGORITHM_LABELS: Record<MvpAlgorithmId, string> = {
  'nearest-exit': 'A1 — Nearest Exit',
  'shortest-path-a-star': 'A2 — Shortest Path A*',
  'adaptive-weighted-a-star': 'A4 — Adaptive Weighted A*',
}

export function SimulationDemo() {
  const [algorithm, setAlgorithm] = useState<MvpAlgorithmId>('nearest-exit')

  return (
    <section className="sim-demo">
      <h2>Демо-визуализация движка (E4) + алгоритмы (E5)</h2>

      <p className="sim-demo-note">
        Отладочная визуализация headless-движка. Движением управляет выбранный
        алгоритм <strong>A1/A2/A4</strong> (E5). После события <code>block-exit</code>{' '}
        (тик 6) закрывается правый выход: A2/A4 перенацеливаются на левый, упрямый
        A1 может застрять, если выбрал правый. <strong>Внимание:</strong> карта{' '}
        <code>demoE4</code> — отладочная, <strong>не</strong> финальный эксперимент
        (сценарии S1–S3 — этап E8, метрики — E7). Исследовательских выводов по этому
        демо делать нельзя.
      </p>

      <label className="sim-demo-algo">
        Алгоритм:{' '}
        <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as MvpAlgorithmId)}>
          {MVP_ALGORITHMS.map((id) => (
            <option key={id} value={id}>
              {ALGORITHM_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      {/* key={algorithm}: смена алгоритма пересоздаёт раннер (и движок/policy) с нуля. */}
      <SimulationRunner key={algorithm} algorithm={algorithm} />
    </section>
  )
}

/** Раннер одного алгоритма: строит конфиг/policy и рендерит контролы/сетку. */
function SimulationRunner({ algorithm }: { algorithm: MvpAlgorithmId }) {
  const config = useMemo(() => createDemoE4Config(algorithm), [algorithm])
  const { frame, map, playing, policyName, reset, step, run10, togglePlay } = useSimulationDemo(
    demoE4Scenario,
    config,
    algorithm,
  )

  return (
    <>
      <SimulationStats
        tick={frame.tick}
        status={frame.status}
        total={frame.total}
        evacuated={frame.evacuated}
        onMap={frame.onMap}
        algorithmLabel={ALGORITHM_LABELS[algorithm]}
        evacuatedPercent={frame.evacuatedPercent}
        totalReroutes={frame.totalReroutes}
        meanEvacuationTime={frame.meanEvacuationTime}
        blockedOrStuckCount={frame.blockedOrStuckCount}
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
        Активная policy: <code>{policyName}</code>
      </p>
    </>
  )
}
