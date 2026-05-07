'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
  type DisplayType,
} from '@/app/actions'

type Category = {
  id: string
  name: string
  emoji: string
  display_type: string
  position: number
  is_default: boolean
}

const DISPLAY_TYPES: { value: DisplayType; label: string; hint: string }[] = [
  { value: 'list', label: 'List', hint: '그냥 리스트' },
  { value: 'checklist', label: 'Checklist', hint: '완료 체크' },
  { value: 'priority', label: 'Priority', hint: '1~10 우선순위' },
  { value: 'rule', label: 'Rule', hint: '핀 고정 규칙' },
]

export function CategoryManager({
  open,
  onClose,
  categories,
}: {
  open: boolean
  onClose: () => void
  categories: Category[]
}) {
  // 시트가 열렸다 닫힐 때 body 스크롤 락
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl border-[1.5px] border-[#d4ad7a] border-b-0 bg-[#fff8ec] p-5 pb-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-warm text-lg font-bold">카테고리 관리</h2>
          <button
            onClick={onClose}
            className="text-warm-soft flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-stone-200"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <CategoryList categories={categories} />

        <div className="mt-6 border-t border-[#efd6b3] pt-5">
          <p className="section-label mb-3 px-1">새 카테고리 추가</p>
          <CategoryAddForm />
        </div>
      </div>
    </div>
  )
}

function CategoryList({ categories }: { categories: Category[] }) {
  const [, startTransition] = useTransition()

  function move(idx: number, direction: -1 | 1) {
    const target = idx + direction
    if (target < 0 || target >= categories.length) return
    const next = [...categories]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    startTransition(async () => {
      await reorderCategories(next.map((c) => c.id))
    })
  }

  return (
    <ul className="flex flex-col gap-2">
      {categories.map((c, idx) => (
        <CategoryRow
          key={c.id}
          category={c}
          canMoveUp={idx > 0}
          canMoveDown={idx < categories.length - 1}
          onMoveUp={() => move(idx, -1)}
          onMoveDown={() => move(idx, 1)}
        />
      ))}
    </ul>
  )
}

function CategoryRow({
  category,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  category: Category
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [emoji, setEmoji] = useState(category.emoji)
  const [displayType, setDisplayType] = useState<DisplayType>(
    category.display_type as DisplayType,
  )
  const [, startTransition] = useTransition()

  function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      setName(category.name)
      setEditing(false)
      return
    }
    startTransition(async () => {
      await updateCategory(category.id, {
        name: trimmed,
        emoji,
        displayType,
      })
    })
    setEditing(false)
  }

  function cancel() {
    setName(category.name)
    setEmoji(category.emoji)
    setDisplayType(category.display_type as DisplayType)
    setEditing(false)
  }

  function onDelete() {
    const ok = window.confirm(
      `"${category.name}" 카테고리를 삭제할까요?\n안의 모든 항목도 같이 삭제됩니다.`,
    )
    if (!ok) return
    startTransition(async () => {
      await deleteCategory(category.id)
    })
  }

  if (editing) {
    return (
      <li className="card-active rounded-2xl p-3">
        <div className="mb-2 flex gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="📌"
            maxLength={4}
            className="input text-warm w-14 rounded-xl px-3 py-2 text-center text-lg"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="카테고리 이름"
            maxLength={20}
            className="input text-warm flex-1 rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div className="mb-3 grid grid-cols-4 gap-1">
          {DISPLAY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setDisplayType(t.value)}
              className={`rounded-lg px-1 py-1.5 text-[10px] font-medium transition ${
                displayType === t.value
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-300/50'
                  : 'card-subtle text-warm-soft'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={save}
            className="flex-1 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-300/50"
          >
            저장
          </button>
          <button
            onClick={cancel}
            className="card-subtle text-warm-soft flex-1 rounded-xl py-2 text-sm"
          >
            취소
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="card flex items-center gap-2 rounded-2xl px-3 py-2.5">
      <span className="w-6 text-center text-lg">{category.emoji}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-warm flex-1 cursor-text text-left text-sm"
      >
        <span className="font-medium">{category.name}</span>
        <span className="text-warm-soft ml-2 text-[11px] uppercase">
          {category.display_type}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="text-warm-soft flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-stone-200 disabled:opacity-20"
          aria-label="위로"
        >
          ↑
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="text-warm-soft flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-stone-200 disabled:opacity-20"
          aria-label="아래로"
        >
          ↓
        </button>
        <button
          onClick={onDelete}
          className="text-warm-soft flex h-7 w-7 items-center justify-center rounded-full text-base hover:bg-red-500/10 hover:text-red-500"
          aria-label="삭제"
        >
          ✕
        </button>
      </div>
    </li>
  )
}

function CategoryAddForm() {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📌')
  const [displayType, setDisplayType] = useState<DisplayType>('list')
  const [, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setName('')
    setEmoji('📌')
    setDisplayType('list')
    startTransition(async () => {
      await createCategory({ name: trimmed, emoji, displayType })
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="📌"
          maxLength={4}
          className="input text-warm w-14 rounded-xl px-3 py-2 text-center text-lg"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 카테고리 이름"
          maxLength={20}
          className="input text-warm flex-1 rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-4 gap-1">
        {DISPLAY_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setDisplayType(t.value)}
            className={`rounded-lg px-1 py-1.5 text-[10px] font-medium transition ${
              displayType === t.value
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-300/50'
                : 'card-subtle text-warm-soft'
            }`}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        type="submit"
        disabled={!name.trim()}
        className="w-full rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-300/50 transition hover:shadow-lg hover:shadow-orange-300/70 disabled:opacity-40 disabled:shadow-none"
      >
        + 추가
      </button>
    </form>
  )
}
