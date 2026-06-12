// Детерминированный ГПСЧ для воспроизводимости (SPEC §15, DECISIONS D13).
// Реализация — mulberry32: 32-битный seedable PRNG, ~3 строки, без зависимостей.
// Единственный источник случайности в движке: размещение агентов + приоритеты
// при разрешении конфликтов. Headless, не зависит от React.
import type { Seed } from '../models/index.ts'

/** Поток псевдослучайных чисел от фиксированного seed. */
export interface Rng {
  /** Следующее 32-битное беззнаковое целое. */
  nextU32(): number
  /** Следующее число с плавающей точкой в [0, 1). */
  nextFloat(): number
  /**
   * Детерминированная тасовка на месте (Fisher–Yates).
   * Возвращает тот же массив (мутирует) для удобства.
   */
  shuffle<T>(arr: T[]): T[]
}

/**
 * Создаёт ГПСЧ из целого seed (mulberry32). Один seed → одна детерминированная
 * последовательность. Состояние инкапсулировано в замыкании.
 */
export function createRng(seed: Seed): Rng {
  // Приводим seed к 32-битному беззнаковому целому.
  let state = seed >>> 0

  function nextU32(): number {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (t ^ (t >>> 14)) >>> 0
  }

  function nextFloat(): number {
    return nextU32() / 0x100000000
  }

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(nextFloat() * (i + 1))
      const tmp = arr[i] as T
      arr[i] = arr[j] as T
      arr[j] = tmp
    }
    return arr
  }

  return { nextU32, nextFloat, shuffle }
}
