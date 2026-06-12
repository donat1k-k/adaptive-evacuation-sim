// Контролы прогона симуляции (этап E4). Только кнопки → колбэки контроллера.
interface SimulationControlsProps {
  readonly playing: boolean
  readonly done: boolean
  onReset(): void
  onStep(): void
  onRun10(): void
  onTogglePlay(): void
}

export function SimulationControls({
  playing,
  done,
  onReset,
  onStep,
  onRun10,
  onTogglePlay,
}: SimulationControlsProps) {
  return (
    <div className="sim-controls">
      <button type="button" onClick={onReset}>
        Reset
      </button>
      <button type="button" onClick={onStep} disabled={done || playing}>
        Step
      </button>
      <button type="button" onClick={onRun10} disabled={done || playing}>
        Run 10 steps
      </button>
      <button type="button" onClick={onTogglePlay} disabled={done}>
        {playing ? 'Pause' : 'Run'}
      </button>
    </div>
  )
}
