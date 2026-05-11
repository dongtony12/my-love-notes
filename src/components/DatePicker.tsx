'use client'

import { useEffect, useRef, useState } from 'react'

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

function formatDisplay(iso: string) {
  if (!iso) return '날짜 선택'
  const { y, m, d } = parseISO(iso)
  const date = new Date(y, m, d)
  return `${y}.${pad2(m + 1)}.${pad2(d)} (${DAY_LABELS[date.getDay()]})`
}

function buildGrid(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1)
  const firstDayOfWeek = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  const cells: DayCell[] = []

  // 이전 달 padding
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const py = month === 0 ? year - 1 : year
    const pm = month === 0 ? 11 : month - 1
    const pd = prevMonthLastDay - i
    cells.push({ y: py, m: pm, d: pd, isCurrentMonth: false, iso: toISO(py, pm, pd) })
  }

  // 이번 달
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      y: year,
      m: month,
      d,
      isCurrentMonth: true,
      iso: toISO(year, month, d),
    })
  }

  // 다음 달 padding (총 42칸 = 6주, 레이아웃 안정성)
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

export function DatePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const initial = value ? parseISO(value) : parseISO(todayISO())
  const [viewYear, setViewYear] = useState(initial.y)
  const [viewMonth, setViewMonth] = useState(initial.m)

  function toggleOpen() {
    if (!open) {
      // 열 때 현재 value의 월로 점프
      const v = value ? parseISO(value) : parseISO(todayISO())
      setViewYear(v.y)
      setViewMonth(v.m)
    }
    setOpen((o) => !o)
  }

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

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

  function pick(iso: string) {
    onChange(iso)
    setOpen(false)
  }

  function gotoToday() {
    const t = todayISO()
    const tp = parseISO(t)
    setViewYear(tp.y)
    setViewMonth(tp.m)
    onChange(t)
    setOpen(false)
  }

  const today = todayISO()
  const grid = buildGrid(viewYear, viewMonth)

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="select text-warm flex w-full items-center justify-between rounded-xl px-3 py-2 pr-9 text-left text-sm"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <span className="truncate">{formatDisplay(value)}</span>
        </span>
      </button>

      {open && (
        <div className="card mt-1 rounded-2xl p-3 shadow-md shadow-orange-300/15">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="text-warm-soft hover:text-warm flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-orange-50"
              aria-label="이전 달"
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
              aria-label="다음 달"
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
              const isSelected = cell.iso === value
              const isToday = cell.iso === today
              const dow = new Date(cell.y, cell.m, cell.d).getDay()
              const isSunday = dow === 0
              const isSaturday = dow === 6

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => pick(cell.iso)}
                  className={`flex aspect-square items-center justify-center rounded-lg text-xs transition ${
                    isSelected
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 font-semibold text-white shadow-sm shadow-orange-300/50'
                      : isToday
                        ? 'border border-orange-400 text-warm font-semibold'
                        : !cell.isCurrentMonth
                          ? 'text-stone-300 hover:bg-orange-50/60'
                          : isSunday
                            ? 'text-rose-400 hover:bg-orange-50'
                            : isSaturday
                              ? 'text-sky-500 hover:bg-orange-50'
                              : 'text-warm hover:bg-orange-50'
                  }`}
                >
                  {cell.d}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={gotoToday}
            className="card-subtle text-warm-soft mt-2 w-full rounded-xl py-1.5 text-xs font-medium hover:text-warm"
          >
            오늘로
          </button>
        </div>
      )}
    </div>
  )
}
