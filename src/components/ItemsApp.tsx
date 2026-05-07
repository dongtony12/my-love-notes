'use client'

import { useState, useTransition, useOptimistic, useRef, useEffect } from 'react'
import {
  addItem,
  deleteItem,
  toggleDone,
  updateItem,
  updateHeader,
  signOut,
} from '@/app/actions'
import { CategoryManager } from './CategoryManager'

type Item = {
  id: string
  category_id: string
  content: string
  is_done: boolean
  created_at: string
  updated_at: string
}

type Category = {
  id: string
  name: string
  emoji: string
  display_type: string
  position: number
  is_default: boolean
}

type OptimisticAction =
  | { type: 'add'; item: Item }
  | { type: 'delete'; id: string }
  | { type: 'toggle'; id: string; isDone: boolean }
  | { type: 'update'; id: string; content: string }

function reducer(state: Item[], action: OptimisticAction): Item[] {
  switch (action.type) {
    case 'add':
      return [action.item, ...state]
    case 'delete':
      return state.filter((i) => i.id !== action.id)
    case 'toggle':
      return state.map((i) =>
        i.id === action.id ? { ...i, is_done: action.isDone } : i,
      )
    case 'update':
      return state.map((i) =>
        i.id === action.id ? { ...i, content: action.content } : i,
      )
  }
}

export function ItemsApp({
  items,
  categories,
  headerText,
}: {
  items: Item[]
  categories: Category[]
  headerText: string
}) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [draft, setDraft] = useState('')
  const [managerOpen, setManagerOpen] = useState(false)

  // 사용자가 선택한 id가 categories에 있으면 그걸, 없으면 첫 번째 카테고리
  const activeId =
    categories.find((c) => c.id === selectedId)?.id ??
    categories[0]?.id ??
    ''
  const [, startTransition] = useTransition()
  const [optimisticItems, applyOptimistic] = useOptimistic(items, reducer)
  const [optimisticHeader, applyOptimisticHeader] = useOptimistic(
    headerText,
    (_, next: string) => next,
  )

  const activeMeta = categories.find((c) => c.id === activeId) ?? categories[0]
  const filtered = optimisticItems.filter((i) => i.category_id === activeId)
  const isChecklist = activeMeta?.display_type === 'checklist'
  const doneCount = isChecklist
    ? filtered.filter((i) => i.is_done).length
    : 0

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const content = draft.trim()
    if (!content || !activeId) return
    setDraft('')
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    startTransition(async () => {
      applyOptimistic({
        type: 'add',
        item: {
          id: tempId,
          category_id: activeId,
          content,
          is_done: false,
          created_at: now,
          updated_at: now,
        },
      })
      await addItem(activeId, content)
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: 'delete', id })
      await deleteItem(id)
    })
  }

  function onToggle(id: string, current: boolean) {
    startTransition(async () => {
      applyOptimistic({ type: 'toggle', id, isDone: !current })
      await toggleDone(id, !current)
    })
  }

  function onUpdate(id: string, content: string) {
    const trimmed = content.trim()
    if (!trimmed) return
    startTransition(async () => {
      applyOptimistic({ type: 'update', id, content: trimmed })
      await updateItem(id, trimmed)
    })
  }

  function onUpdateHeader(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    startTransition(async () => {
      applyOptimisticHeader(trimmed)
      await updateHeader(trimmed)
    })
  }

  if (!activeMeta) {
    // 카테고리가 없는 경우 (예외) — 안내
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="text-warm-soft text-sm">
          카테고리가 없어요. 먼저 카테고리를 추가해주세요.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-24 pt-8">
      <header className="mb-7 flex items-center justify-between gap-2">
        <EditableHeader value={optimisticHeader} onSave={onUpdateHeader} />
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setManagerOpen(true)}
            className="card-subtle text-warm-soft flex h-8 w-8 items-center justify-center rounded-full text-base transition hover:[background:#ffffff]"
            aria-label="카테고리 관리"
            title="카테고리 관리"
          >
            ⚙
          </button>
          <form action={signOut}>
            <button
              type="submit"
              className="card-subtle text-warm-soft rounded-full px-3 py-1 text-xs transition hover:[background:#ffffff]"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <CategoryManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        categories={categories}
      />

      <section className="mb-7">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="section-label">카테고리</span>
        </div>
        <nav
          className="card grid gap-1 rounded-2xl p-1.5"
          style={{
            gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, minmax(0, 1fr))`,
          }}
        >
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium transition ${
                activeId === c.id
                  ? 'card-active text-warm'
                  : 'text-warm-soft hover:text-warm'
              }`}
            >
              <span className="text-lg">{c.emoji}</span>
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </nav>
      </section>

      <section className="mb-7">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="section-label">추가하기</span>
        </div>
        <form
          onSubmit={onAdd}
          className="flex items-center gap-1.5 rounded-2xl border-[1.5px] border-[#d4ad7a] bg-white/60 p-1.5 transition-all hover:border-[#b8884f] focus-within:border-orange-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(254,215,170,0.5)]"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`${activeMeta.name} 추가...`}
            className="text-warm flex-1 rounded-xl bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-300/50 transition hover:shadow-lg hover:shadow-orange-300/70 disabled:opacity-40 disabled:shadow-none"
          >
            추가
          </button>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <span className="section-label">{activeMeta.name}</span>
          <span className="text-warm-soft text-xs">
            {isChecklist && filtered.length > 0
              ? `${doneCount} / ${filtered.length}개 완료`
              : `${filtered.length}개`}
          </span>
        </div>

        <ul className="flex flex-col gap-2.5">
          {filtered.length === 0 && (
            <li className="card-subtle text-warm-soft rounded-2xl p-10 text-center text-sm">
              {activeMeta.emoji} 아직 항목이 없어요
            </li>
          )}
          {filtered.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              showCheckbox={isChecklist}
              onDelete={onDelete}
              onToggle={onToggle}
              onUpdate={onUpdate}
            />
          ))}
        </ul>
      </section>
    </main>
  )
}

function EditableHeader({
  value,
  onSave,
}: {
  value: string
  onSave: (text: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function startEdit() {
    setDraft(value)
    setEditing(true)
  }

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    }
    setEditing(false)
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        maxLength={40}
        className="text-warm flex-1 rounded-md border-[1.5px] border-orange-400 bg-white px-2 py-1 text-xl font-bold tracking-tight outline-none shadow-[0_0_0_3px_rgba(254,215,170,0.5)]"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="text-warm flex-1 cursor-text truncate text-left text-xl font-bold tracking-tight transition hover:opacity-80"
      title="클릭해서 헤더 변경"
    >
      {value}
    </button>
  )
}

function ItemRow({
  item,
  showCheckbox,
  onDelete,
  onToggle,
  onUpdate,
}: {
  item: Item
  showCheckbox: boolean
  onDelete: (id: string) => void
  onToggle: (id: string, current: boolean) => void
  onUpdate: (id: string, content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.content)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function startEdit() {
    setDraft(item.content)
    setEditing(true)
  }

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== item.content) {
      onUpdate(item.id, trimmed)
    }
    setEditing(false)
  }

  function cancel() {
    setDraft(item.content)
    setEditing(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  return (
    <li className="card group flex items-center gap-3 rounded-2xl px-4 py-3.5 transition hover:card-active">
      {showCheckbox && (
        <button
          onClick={() => onToggle(item.id, item.is_done)}
          disabled={editing}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
            item.is_done
              ? 'border-orange-400 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-300/50'
              : 'border-stone-300'
          }`}
          aria-label="완료 토글"
        >
          {item.is_done && <span className="text-xs leading-none">✓</span>}
        </button>
      )}

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          className="text-warm flex-1 rounded-md border-[1.5px] border-orange-400 bg-white px-2 py-1 text-sm outline-none shadow-[0_0_0_3px_rgba(254,215,170,0.5)]"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className={`text-warm flex-1 cursor-text text-left text-sm ${
            showCheckbox && item.is_done
              ? 'text-warm-soft line-through opacity-60'
              : ''
          }`}
        >
          {item.content}
        </button>
      )}

      {!editing && (
        <button
          onClick={() => onDelete(item.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base text-stone-400 transition hover:bg-red-500/10 hover:text-red-500"
          aria-label="삭제"
        >
          ✕
        </button>
      )}
    </li>
  )
}
