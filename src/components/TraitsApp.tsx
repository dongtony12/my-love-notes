'use client'

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import {
  createTrait,
  deleteTrait,
  togglePin,
  updateTrait,
} from '@/app/traits/actions'
import { CycleCard } from './CycleCard'

type Trait = {
  id: string
  label: string
  content: string
  is_pinned: boolean
  position: number
  created_at: string
  updated_at: string
}

type OptimisticAction =
  | { type: 'add'; trait: Trait }
  | { type: 'update'; id: string; patch: Partial<Trait> }
  | { type: 'pin'; id: string; isPinned: boolean }
  | { type: 'delete'; id: string }

function reducer(state: Trait[], action: OptimisticAction): Trait[] {
  switch (action.type) {
    case 'add':
      return [action.trait, ...state]
    case 'update':
      return state.map((t) =>
        t.id === action.id ? { ...t, ...action.patch } : t,
      )
    case 'pin':
      return state.map((t) =>
        t.id === action.id ? { ...t, is_pinned: action.isPinned } : t,
      )
    case 'delete':
      return state.filter((t) => t.id !== action.id)
  }
}

// 기본 프로필 슬롯 — 비어있어도 카드로 노출되어 채워넣기 유도
const DEFAULT_PROFILE: { label: string; emoji: string; placeholder: string }[] =
  [
    { label: '이름', emoji: '👤', placeholder: '애인 이름' },
    { label: '생일', emoji: '🎂', placeholder: '예: 8월 15일' },
    { label: 'MBTI', emoji: '🧠', placeholder: '예: ENFP' },
    { label: '옷 사이즈', emoji: '👕', placeholder: '예: M / 신발 240' },
    { label: '알레르기', emoji: '⚠️', placeholder: '주의 음식/물질' },
  ]
const DEFAULT_LABELS = new Set(DEFAULT_PROFILE.map((p) => p.label))

type AddingSection = 'profile' | 'trait' | null

export function TraitsApp({
  traits,
  cycleDays,
  lastPeriodDate,
  cycleVariance,
}: {
  traits: Trait[]
  cycleDays: number | null
  lastPeriodDate: string | null
  cycleVariance: number
}) {
  const [optimisticTraits, applyOptimistic] = useOptimistic(traits, reducer)
  const [, startTransition] = useTransition()
  const [adding, setAdding] = useState<AddingSection>(null)
  const [prefillLabel, setPrefillLabel] = useState<string>('')

  const profile = optimisticTraits.filter((t) => t.is_pinned)
  const others = optimisticTraits
    .filter((t) => !t.is_pinned)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const profileByLabel = new Map(profile.map((p) => [p.label, p]))
  const customProfile = profile
    .filter((p) => !DEFAULT_LABELS.has(p.label))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  function onAdd(input: { label: string; content: string }, isPinned: boolean) {
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    setAdding(null)
    setPrefillLabel('')
    startTransition(async () => {
      applyOptimistic({
        type: 'add',
        trait: {
          id: tempId,
          label: input.label,
          content: input.content,
          is_pinned: isPinned,
          position: 9999,
          created_at: now,
          updated_at: now,
        },
      })
      await createTrait({ ...input, isPinned })
    })
  }

  function onUpdate(id: string, patch: { label?: string; content?: string }) {
    if (id.startsWith('temp-')) return
    startTransition(async () => {
      applyOptimistic({ type: 'update', id, patch })
      await updateTrait(id, patch)
    })
  }

  function onTogglePin(id: string, current: boolean) {
    if (id.startsWith('temp-')) return
    startTransition(async () => {
      applyOptimistic({ type: 'pin', id, isPinned: !current })
      await togglePin(id, !current)
    })
  }

  function onDelete(id: string) {
    if (id.startsWith('temp-')) return
    startTransition(async () => {
      applyOptimistic({ type: 'delete', id })
      await deleteTrait(id)
    })
  }

  function openProfileForm(prefill?: string) {
    setPrefillLabel(prefill ?? '')
    setAdding('profile')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md min-w-0 flex-col overflow-x-hidden px-4 pt-safe pb-safe-32">
      <header className="mb-6">
        <h1 className="text-warm text-xl font-bold tracking-tight">🎯 특징</h1>
      </header>

      {/* 프로필 섹션 */}
      <section className="mb-7 min-w-0">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="section-label">🪪 프로필</span>
          {adding !== 'profile' && (
            <button
              type="button"
              onClick={() => openProfileForm()}
              className="text-warm-soft hover:text-warm rounded-full bg-white/80 px-3 py-0.5 text-xs font-medium shadow-sm shadow-orange-300/20"
            >
              + 추가
            </button>
          )}
        </div>

        {adding === 'profile' && (
          <div className="mb-3">
            <TraitForm
              mode="create"
              hint="짧은 기본 정보 (예: 옷 사이즈, MBTI, 생일)"
              initial={{ label: prefillLabel, content: '' }}
              onSave={(input) => onAdd(input, true)}
              onCancel={() => {
                setAdding(null)
                setPrefillLabel('')
              }}
            />
          </div>
        )}

        <ul className="flex flex-col gap-2.5">
          <CycleCard
            cycleDays={cycleDays}
            lastPeriodDate={lastPeriodDate}
            cycleVariance={cycleVariance}
          />
          {DEFAULT_PROFILE.map((field) => {
            const existing = profileByLabel.get(field.label)
            if (existing) {
              return (
                <TraitCard
                  key={field.label}
                  trait={existing}
                  onUpdate={onUpdate}
                  onTogglePin={onTogglePin}
                  onDelete={onDelete}
                />
              )
            }
            return (
              <BlankSlot
                key={field.label}
                emoji={field.emoji}
                label={field.label}
                placeholder={field.placeholder}
                onClick={() => openProfileForm(field.label)}
              />
            )
          })}
          {customProfile.map((t) => (
            <TraitCard
              key={t.id}
              trait={t}
              onUpdate={onUpdate}
              onTogglePin={onTogglePin}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </section>

      {/* 일반 특징 섹션 */}
      <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-baseline gap-2">
            <span className="section-label">📝 일반 특징</span>
            <span className="text-warm-soft text-xs">{others.length}개</span>
          </div>
          {adding !== 'trait' && (
            <button
              type="button"
              onClick={() => setAdding('trait')}
              className="text-warm-soft hover:text-warm rounded-full bg-white/80 px-3 py-0.5 text-xs font-medium shadow-sm shadow-orange-300/20"
            >
              + 추가
            </button>
          )}
        </div>

        {adding === 'trait' && (
          <div className="mb-3">
            <TraitForm
              mode="create"
              hint="자유롭게 발견한 특징 (예: 좋아하는 음식, 무서워하는 것)"
              initial={{ label: '', content: '' }}
              onSave={(input) => onAdd(input, false)}
              onCancel={() => setAdding(null)}
            />
          </div>
        )}

        <ul className="flex flex-col gap-2.5">
          {others.length === 0 && adding !== 'trait' && (
            <li className="card-subtle text-warm-soft rounded-2xl p-6 text-center text-xs">
              📝 발견한 특징을 자유롭게 적어보세요
            </li>
          )}
          {others.map((t) => (
            <TraitCard
              key={t.id}
              trait={t}
              onUpdate={onUpdate}
              onTogglePin={onTogglePin}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </section>
    </main>
  )
}

function BlankSlot({
  emoji,
  label,
  placeholder,
  onClick,
}: {
  emoji: string
  label: string
  placeholder: string
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="card-subtle hover:card flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-base opacity-60">
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-warm text-sm font-semibold">{label}</div>
          <div className="text-warm-soft mt-0.5 text-xs opacity-70">
            {placeholder}
          </div>
        </div>
        <span className="text-warm-soft text-xs opacity-60">+ 채우기</span>
      </button>
    </li>
  )
}

function TraitCard({
  trait,
  onUpdate,
  onTogglePin,
  onDelete,
}: {
  trait: Trait
  onUpdate: (id: string, patch: { label?: string; content?: string }) => void
  onTogglePin: (id: string, current: boolean) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const isSaving = trait.id.startsWith('temp-')
  const disableActions = editing || isSaving
  const isDefaultProfile = trait.is_pinned && DEFAULT_LABELS.has(trait.label)
  const defaultEmoji = isDefaultProfile
    ? DEFAULT_PROFILE.find((p) => p.label === trait.label)!.emoji
    : null

  if (editing) {
    return (
      <li>
        <TraitForm
          mode="edit"
          initial={{
            label: trait.label,
            content: trait.content,
          }}
          onSave={(input) => {
            onUpdate(trait.id, {
              label: input.label,
              content: input.content,
            })
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
      <button
        onClick={() => onTogglePin(trait.id, trait.is_pinned)}
        disabled={disableActions}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm transition ${
          trait.is_pinned
            ? 'bg-orange-100 text-orange-600 shadow-sm shadow-orange-200/60'
            : 'text-stone-400 hover:bg-orange-50 hover:text-orange-500'
        }`}
        aria-label={trait.is_pinned ? '일반 특징으로 이동' : '프로필로 이동'}
        title={trait.is_pinned ? '일반 특징으로 이동' : '프로필로 이동'}
      >
        {defaultEmoji ?? (trait.is_pinned ? '🪪' : '📝')}
      </button>

      <button
        type="button"
        onClick={() => !isSaving && setEditing(true)}
        disabled={isSaving}
        className="text-warm min-w-0 flex-1 cursor-text text-left"
      >
        <div className="text-warm font-semibold text-sm break-words">
          {trait.label}
        </div>
        {trait.content && (
          <div className="text-warm-soft mt-1 text-xs leading-relaxed whitespace-pre-wrap break-words">
            {trait.content}
          </div>
        )}
      </button>

      <button
        onClick={() => onDelete(trait.id)}
        disabled={isSaving}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base text-stone-400 transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
        aria-label="삭제"
      >
        ✕
      </button>
    </li>
  )
}

function TraitForm({
  mode,
  initial,
  hint,
  onSave,
  onCancel,
}: {
  mode: 'create' | 'edit'
  initial: { label: string; content: string }
  hint?: string
  onSave: (input: { label: string; content: string }) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initial.label)
  const [content, setContent] = useState(initial.content)
  const labelRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // 라벨이 이미 채워져있으면 (preset 슬롯 클릭한 경우) 바로 본문 포커스
    if (initial.label) {
      contentRef.current?.focus()
    } else {
      labelRef.current?.focus()
    }
  }, [initial.label])

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) return
    onSave({ label: trimmed, content: content.trim() })
  }

  return (
    <form
      onSubmit={submit}
      className="card rounded-2xl p-3 shadow-sm shadow-orange-300/20"
    >
      {hint && mode === 'create' && (
        <p className="text-warm-soft mb-2 px-1 text-[11px]">{hint}</p>
      )}
      <input
        ref={labelRef}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="라벨"
        maxLength={40}
        required
        className="input text-warm mb-2 w-full rounded-xl px-3 py-2 text-sm font-semibold"
      />
      <textarea
        ref={contentRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="본문 (선택)"
        maxLength={500}
        rows={3}
        className="input text-warm mb-3 w-full resize-none rounded-xl px-3 py-2 text-sm leading-relaxed"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!label.trim()}
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
