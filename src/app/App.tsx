import './App.css'
import { SimulationDemo } from '../components/index.ts'

/**
 * Приложение-стенд. На этапе E4 добавлена базовая отладочная визуализация
 * headless-движка (StubGreedyPolicy — временная demo-policy, не A1/A2/A4).
 * Логика UI — в компонентах (src/components); App остаётся тонким.
 */

interface StageItem {
  id: string
  title: string
  done: boolean
}

const STAGES: readonly StageItem[] = [
  { id: 'E0', title: 'Подготовка репозитория и документации', done: true },
  { id: 'E1', title: 'Каркас Vite + React + TypeScript', done: true },
  { id: 'E2', title: 'Модели данных (src/models)', done: true },
  { id: 'E3', title: 'Headless simulation engine (src/simulation)', done: true },
  { id: 'E4', title: 'Базовая визуализация (src/components)', done: true },
  { id: 'E5', title: 'Алгоритмы A1 / A2 / A4 (src/algorithms)', done: false },
  { id: 'E6', title: 'Динамические события', done: false },
  { id: 'E7', title: 'Метрики (src/metrics)', done: false },
  { id: 'E8', title: 'Сценарии (src/scenarios)', done: false },
  { id: 'E9', title: 'Графики и экспорт', done: false },
]

export function App() {
  return (
    <main className="app">
      <h1>Adaptive Evacuation Sim</h1>
      <p className="subtitle">Исследовательский стенд адаптивной эвакуации</p>

      <p className="note">
        Программная модель для сравнения алгоритмов маршрутизации при эвакуации
        в динамически изменяющейся среде. Это исследовательский стенд, а не игра
        и не проект по ОБЖ: цель — количественные метрики и воспроизводимые
        эксперименты. Headless-движок готов (E3); ниже — отладочная визуализация
        на временной demo-policy. Настоящие алгоритмы A1/A2/A4 ещё не реализованы
        (см. <code>docs/PROJECT_PLAN.md</code>).
      </p>

      <h2>Статус этапов</h2>
      <ul className="status-list">
        {STAGES.map((stage) => (
          <li key={stage.id}>
            {stage.done ? '✅' : '⬜'} <code>{stage.id}</code> — {stage.title}
          </li>
        ))}
      </ul>

      <SimulationDemo />
    </main>
  )
}
