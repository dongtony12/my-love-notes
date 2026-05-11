'use client'

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import {
  createSpecialDay,
  deleteSpecialDay,
  updateSpecialDay,
} from '@/app/special-days/actions'
import { DatePicker } from './DatePicker'

type Day = {
  id: string
  date: string
  title: string
  content: string | null
  emoji: string
  created_at: string
  updated_at: string
}

type OptimisticAction =
  | { type: 'add'; day: Day }
  | { type: 'update'; id: string; patch: Partial<Day> }
  | { type: 'delete'; id: string }

function reducer(state: Day[], action: OptimisticAction): Day[] {
  switch (action.type) {
    case 'add':
      return [action.day, ...state].sort((a, b) =>
        b.date.localeCompare(a.date),
      )
    case 'update':
      return state
        .map((d) => (d.id === action.id ? { ...d, ...action.patch } : d))
        .sort((a, b) => b.date.localeCompare(a.date))
    case 'delete':
      return state.filter((d) => d.id !== action.id)
  }
}

const dayLabel = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d)
  return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')} (${dayLabel[date.getDay()]})`
}

function todayISO() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function SpecialDaysApp({ days }: { days: Day[] }) {
  const [optimisticDays, applyOptimistic] = useOptimistic(days, reducer)
  const [, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)

  function onAdd(input: {
    date: string
    emoji: string
    title: string
    content: string
  }) {
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    setAdding(false)
    startTransition(async () => {
      applyOptimistic({
        type: 'add',
        day: {
          id: tempId,
          date: input.date,
          title: input.title,
          content: input.content || null,
          emoji: input.emoji || '💝',
          created_at: now,
          updated_at: now,
        },
      })
      await createSpecialDay(input)
    })
  }

  function onUpdate(id: string, patch: Partial<Day>) {
    startTransition(async () => {
      applyOptimistic({ type: 'update', id, patch })
      await updateSpecialDay(id, patch)
    })
  }

  function onDelete(id: string) {
    if (id.startsWith('temp-')) return
    startTransition(async () => {
      applyOptimistic({ type: 'delete', id })
      await deleteSpecialDay(id)
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md min-w-0 flex-col overflow-x-hidden px-4 pb-32 pt-8">
      <header className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-warm text-xl font-bold tracking-tight">
          💝 특별한 날
        </h1>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-orange-300/50 transition hover:shadow-lg hover:shadow-orange-300/70"
          >
            + 추가
          </button>
        )}
      </header>

      {adding && (
        <section className="mb-6">
          <DayForm
            mode="create"
            initial={{
              date: todayISO(),
              emoji: '💝',
              title: '',
              content: '',
            }}
            onSave={onAdd}
            onCancel={() => setAdding(false)}
          />
        </section>
      )}

      <section className="min-w-0">
        <div className="mb-3 flex items-end justify-between px-1">
          <span className="section-label">기록</span>
          <span className="text-warm-soft text-xs">
            {optimisticDays.length}개
          </span>
        </div>

        <ul className="flex flex-col gap-2.5">
          {optimisticDays.length === 0 && !adding && (
            <li className="card-subtle text-warm-soft rounded-2xl p-10 text-center text-sm">
              💝 아직 기록한 날이 없어요
            </li>
          )}
          {optimisticDays.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </section>
    </main>
  )
}

function DayCard({
  day,
  onUpdate,
  onDelete,
}: {
  day: Day
  onUpdate: (id: string, patch: Partial<Day>) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const isSaving = day.id.startsWith('temp-')

  if (editing) {
    return (
      <li>
        <DayForm
          mode="edit"
          initial={{
            date: day.date,
            emoji: day.emoji,
            title: day.title,
            content: day.content ?? '',
          }}
          onSave={(input) => {
            onUpdate(day.id, { ...input, content: input.content || null })
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li
      className={`card group flex items-start gap-3 rounded-2xl px-4 py-3.5 transition hover:card-active ${
        isSaving ? 'animate-pulse opacity-60' : ''
      }`}
    >
      <span className="mt-0.5 text-2xl">{day.emoji}</span>
      <button
        type="button"
        onClick={() => !isSaving && setEditing(true)}
        disabled={isSaving}
        className="flex-1 cursor-text text-left"
      >
        <div className="text-warm-soft text-[11px] font-medium tracking-wider">
          {formatDate(day.date)}
        </div>
        <div className="text-warm mt-0.5 text-sm font-semibold">
          {day.title}
        </div>
        {day.content && (
          <div className="text-warm-soft mt-1 text-xs leading-relaxed">
            {day.content}
          </div>
        )}
      </button>
      <button
        onClick={() => onDelete(day.id)}
        disabled={isSaving}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base text-stone-400 transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
        aria-label="삭제"
      >
        ✕
      </button>
    </li>
  )
}

function DayForm({
  mode,
  initial,
  onSave,
  onCancel,
}: {
  mode: 'create' | 'edit'
  initial: { date: string; emoji: string; title: string; content: string }
  onSave: (input: {
    date: string
    emoji: string
    title: string
    content: string
  }) => void
  onCancel: () => void
}) {
  const [date, setDate] = useState(initial.date)
  const [emoji, setEmoji] = useState(initial.emoji)
  const [title, setTitle] = useState(initial.title)
  const [content, setContent] = useState(initial.content)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || !date) return
    onSave({
      date,
      emoji: emoji.trim() || '💝',
      title: trimmed,
      content: content.trim(),
    })
  }

  return (
    <form
      onSubmit={submit}
      className="card rounded-2xl p-3 shadow-sm shadow-orange-300/20"
    >
      <div className="mb-2 flex items-start gap-2">
        <div className="flex-1">
          <DatePicker value={date} onChange={setDate} />
        </div>
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="💝"
          maxLength={4}
          className="input text-warm w-14 rounded-xl px-3 py-2 text-center text-lg"
        />
      </div>
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목 (예: 첫 데이트)"
        maxLength={40}
        required
        className="input text-warm mb-2 w-full rounded-xl px-3 py-2 text-sm"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="짧은 메모 (선택)"
        maxLength={200}
        rows={2}
        className="input text-warm mb-3 w-full resize-none rounded-xl px-3 py-2 text-sm leading-relaxed"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title.trim() || !date}
          className="flex-1 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-300/50 transition hover:shadow-lg hover:shadow-orange-300/70 disabled:opacity-40 disabled:shadow-none"
        >
          {mode === 'create' ? '추가' : '저장'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="card-subtle text-warm-soft flex-1 rounded-xl py-2.5 text-sm"
        >
          취소
        </button>
      </div>
    </form>
  )
}
