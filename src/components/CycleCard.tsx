'use client'

import { useEffect, useState, useTransition, useOptimistic } from 'react'
import { updateCycle } from '@/app/actions'
import { DatePicker } from './DatePicker'

type DayCell = {
  y: number
  m: number
  d: number
  isCurrentMonth: boolean
  iso: string
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toISO(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m - 1, d }
}

function todayISO() {
  const now = new Date()
  return toISO(now.getFullYear(), now.getMonth(), now.getDate())
}

function daysBetween(a: string, b: string): number {
  const da = new Date(parseISO(a).y, parseISO(a).m, parseISO(a).d)
  const db = new Date(parseISO(b).y, parseISO(b).m, parseISO(b).d)
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

function addDays(iso: string, days: number): string {
  const { y, m, d } = parseISO(iso)
  const date = new Date(y, m, d + days)
  return toISO(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatShort(iso: string) {
  const { y, m, d } = parseISO(iso)
  const date = new Date(y, m, d)
  return `${m + 1}월 ${d}일 (${DAY_LABELS[date.getDay()]})`
}

function shortMD(iso: string) {
  const { m, d } = parseISO(iso)
  return `${m + 1}/${d}`
}

function buildGrid(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1)
  const firstDayOfWeek = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  const cells: DayCell[] = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const py = month === 0 ? year - 1 : year
    const pm = month === 0 ? 11 : month - 1
    const pd = prevMonthLastDay - i
    cells.push({ y: py, m: pm, d: pd, isCurrentMonth: false, iso: toISO(py, pm, pd) })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      y: year,
      m: month,
      d,
      isCurrentMonth: true,
      iso: toISO(year, month, d),
    })
  }
  let nextD = 1
  while (cells.length < 42) {
    const ny = month === 11 ? year + 1 : year
    const nm = month === 11 ? 0 : month + 1
    cells.push({
      y: ny,
      m: nm,
      d: nextD,
      isCurrentMonth: false,
      iso: toISO(ny, nm, nextD),
    })
    nextD++
  }
  return cells
}

/** 향후 N회 중심 예상일 */
function predictCenters(
  lastPeriod: string,
  cycleDays: number,
  count = 12,
): string[] {
  return Array.from({ length: count }, (_, i) =>
    addDays(lastPeriod, cycleDays * (i + 1)),
  )
}

/**
 * 각 중심 예상일로부터 ±variance 범위의 모든 날짜에 대해
 * (날짜 → 중심에서 떨어진 절대 거리) Map 을 생성.
 * 같은 날짜가 두 예상 범위에 모두 속하면 가까운 쪽 거리 사용.
 */
function buildBandMap(
  centers: string[],
  variance: number,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const center of centers) {
    for (let offset = -variance; offset <= variance; offset++) {
      const iso = addDays(center, offset)
      const dist = Math.abs(offset)
      const prev = map.get(iso)
      if (prev === undefined || dist < prev) {
        map.set(iso, dist)
      }
    }
  }
  return map
}

/** 거리 → Tailwind/inline 스타일 매핑 (진하기 단계) */
function bandShade(dist: number, variance: number) {
  if (dist === 0) {
    // 중심: 진한 그라데이션
    return 'bg-gradient-to-br from-amber-300 to-orange-500 text-white font-semibold shadow-sm shadow-orange-300/50'
  }
  const ratio = variance > 0 ? 1 - dist / (variance + 1) : 0
  // ratio: 0.8 → 0.2 정도 사이로 떨어짐
  const opacity = Math.max(0.18, ratio * 0.55).toFixed(2)
  return ''
  // 인라인 스타일로 직접 처리
  void opacity
}

export function CycleCard({
  cycleDays,
  lastPeriodDate,
  cycleVariance,
}: {
  cycleDays: number | null
  lastPeriodDate: string | null
  cycleVariance: number
}) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const [optimisticCycle, setOptimisticCycle] = useOptimistic(
    { cycleDays, lastPeriodDate, cycleVariance },
    (
      _,
      next: {
        cycleDays: number | null
        lastPeriodDate: string | null
        cycleVariance: number
      },
    ) => next,
  )

  const isConfigured =
    optimisticCycle.cycleDays !== null && optimisticCycle.lastPeriodDate !== null

  const nextDate =
    isConfigured && optimisticCycle.lastPeriodDate && optimisticCycle.cycleDays
      ? addDays(optimisticCycle.lastPeriodDate, optimisticCycle.cycleDays)
      : null

  const today = todayISO()
  const dDay = nextDate ? daysBetween(today, nextDate) : null
  const variance = optimisticCycle.cycleVariance
  const rangeStart = nextDate ? addDays(nextDate, -variance) : null
  const rangeEnd = nextDate ? addDays(nextDate, variance) : null

  function save(input: {
    cycleDays: number | null
    lastPeriodDate: string | null
    cycleVariance: number
  }) {
    setOpen(false)
    startTransition(async () => {
      setOptimisticCycle(input)
      await updateCycle(input)
    })
  }

  return (
    <>
      <li>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="card-active group flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition hover:card"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center text-base">
            📅
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-warm text-sm font-semibold">월경 주기</div>
            {isConfigured && nextDate && dDay !== null ? (
              <div className="text-warm-soft mt-1 text-xs leading-relaxed">
                주기 {optimisticCycle.cycleDays}일
                {variance > 0 && ` ±${variance}일`} · 마지막{' '}
                {formatShort(optimisticCycle.lastPeriodDate!)}
                <br />
                <span className="text-warm font-medium">
                  다음 예상 {formatShort(nextDate)}
                  {variance > 0 && rangeStart && rangeEnd && (
                    <span className="text-warm-soft">
                      {' '}
                      ({shortMD(rangeStart)}~{shortMD(rangeEnd)})
                    </span>
                  )}
                  {' · '}
                  <span className="text-orange-500">
                    {dDay === 0
                      ? 'D-Day'
                      : dDay > 0
                        ? `D-${dDay}`
                        : `D+${-dDay}`}
                  </span>
                </span>
              </div>
            ) : (
              <div className="text-warm-soft mt-0.5 text-xs opacity-70">
                탭해서 주기와 마지막 시작일 입력
              </div>
            )}
          </div>
          <span className="text-warm-soft text-xs opacity-60">
            {isConfigured ? '편집' : '+ 채우기'}
          </span>
        </button>
      </li>

      {open && (
        <CycleSheet
          initialCycleDays={optimisticCycle.cycleDays ?? 28}
          initialLastPeriodDate={optimisticCycle.lastPeriodDate}
          initialVariance={optimisticCycle.cycleVariance}
          onSave={save}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function CycleSheet({
  initialCycleDays,
  initialLastPeriodDate,
  initialVariance,
  onSave,
  onClose,
}: {
  initialCycleDays: number
  initialLastPeriodDate: string | null
  initialVariance: number
  onSave: (input: {
    cycleDays: number | null
    lastPeriodDate: string | null
    cycleVariance: number
  }) => void
  onClose: () => void
}) {
  const [cycleDays, setCycleDays] = useState(initialCycleDays)
  const [variance, setVariance] = useState(initialVariance)
  const [lastPeriodDate, setLastPeriodDate] = useState<string>(
    initialLastPeriodDate ?? todayISO(),
  )
  const initial = parseISO(lastPeriodDate)
  const [viewYear, setViewYear] = useState(initial.y)
  const [viewMonth, setViewMonth] = useState(initial.m)

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1)
      setViewMonth(11)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1)
      setViewMonth(0)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  function submit() {
    if (!lastPeriodDate) return
    onSave({ cycleDays, lastPeriodDate, cycleVariance: variance })
  }

  function clearAll() {
    onSave({ cycleDays: null, lastPeriodDate: null, cycleVariance: variance })
  }

  const centers = predictCenters(lastPeriodDate, cycleDays, 12)
  const band = buildBandMap(centers, variance)
  const today = todayISO()
  const grid = buildGrid(viewYear, viewMonth)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-[1.5px] border-b-0 border-[#d4ad7a] bg-[#fff8ec] p-5 pb-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-warm text-lg font-bold">📅 월경 주기</h2>
          <button
            onClick={onClose}
            className="text-warm-soft flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-stone-200"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 space-y-3">
          <div>
            <label className="section-label mb-2 block px-1">
              마지막 시작일
            </label>
            <DatePicker value={lastPeriodDate} onChange={setLastPeriodDate} />
          </div>

          <div>
            <label className="section-label mb-2 block px-1">
              주기 일수 · {cycleDays}일
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={20}
                max={40}
                value={cycleDays}
                onChange={(e) => setCycleDays(Number(e.target.value))}
                className="flex-1 accent-orange-500"
              />
              <input
                type="number"
                min={14}
                max={60}
                value={cycleDays}
                onChange={(e) => setCycleDays(Number(e.target.value) || 28)}
                className="input text-warm w-16 rounded-xl px-2 py-1.5 text-center text-sm"
              />
            </div>
          </div>

          <div>
            <label className="section-label mb-2 block px-1">
              변동폭 · ± {variance}일
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={7}
                value={variance}
                onChange={(e) => setVariance(Number(e.target.value))}
                className="flex-1 accent-orange-500"
              />
              <input
                type="number"
                min={0}
                max={7}
                value={variance}
                onChange={(e) =>
                  setVariance(
                    Math.min(7, Math.max(0, Number(e.target.value) || 0)),
                  )
                }
                className="input text-warm w-16 rounded-xl px-2 py-1.5 text-center text-sm"
              />
            </div>
            <p className="text-warm-soft mt-1 px-1 text-[10px]">
              예상일을 중심으로 ± 며칠을 안전 범위로 볼지
            </p>
          </div>
        </div>

        {/* 캘린더 미리보기 */}
        <div className="card mb-4 rounded-2xl p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="text-warm-soft hover:text-warm flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-orange-50"
            >
              ←
            </button>
            <div className="text-warm text-sm font-semibold tracking-tight">
              {viewYear}년 {viewMonth + 1}월
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="text-warm-soft hover:text-warm flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-orange-50"
            >
              →
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {DAY_LABELS.map((label, idx) => (
              <div
                key={label}
                className={`text-center text-[10px] font-medium uppercase tracking-wider ${
                  idx === 0
                    ? 'text-rose-400/70'
                    : idx === 6
                      ? 'text-sky-400/70'
                      : 'text-warm-soft'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((cell) => {
              const isLast = cell.iso === lastPeriodDate
              const bandDist = band.get(cell.iso)
              const isInBand = bandDist !== undefined
              const isCenter = bandDist === 0
              const isToday = cell.iso === today
              const dow = new Date(cell.y, cell.m, cell.d).getDay()
              const isSunday = dow === 0
              const isSaturday = dow === 6

              const bandOpacity =
                isInBand && !isCenter && variance > 0
                  ? Math.max(0.18, 0.6 * (1 - bandDist / (variance + 1)))
                  : 0

              return (
                <div
                  key={cell.iso}
                  className={`relative flex aspect-square items-center justify-center rounded-lg text-xs ${
                    isCenter
                      ? bandShade(0, variance)
                      : isInBand
                        ? 'text-warm font-medium'
                        : isLast
                          ? 'bg-stone-300/70 font-semibold text-white'
                          : isToday
                            ? 'border border-orange-400 text-warm font-semibold'
                            : !cell.isCurrentMonth
                              ? 'text-stone-300'
                              : isSunday
                                ? 'text-rose-400'
                                : isSaturday
                                  ? 'text-sky-500'
                                  : 'text-warm'
                  }`}
                  style={
                    isInBand && !isCenter
                      ? {
                          backgroundColor: `rgba(251, 146, 60, ${bandOpacity.toFixed(2)})`,
                        }
                      : undefined
                  }
                >
                  {cell.d}
                </div>
              )
            })}
          </div>

          <div className="text-warm-soft mt-3 flex items-center justify-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-stone-300/70" />
              마지막
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-gradient-to-br from-amber-300 to-orange-500" />
              예상
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-orange-300/40" />
              ±{variance}일
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded border border-orange-400" />
              오늘
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!lastPeriodDate}
            className="flex-1 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-300/50 transition hover:shadow-lg hover:shadow-orange-300/70 disabled:opacity-40 disabled:shadow-none"
          >
            저장
          </button>
          {initialLastPeriodDate && (
            <button
              type="button"
              onClick={clearAll}
              className="card-subtle text-warm-soft rounded-xl px-4 py-2.5 text-sm"
            >
              초기화
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
