'use client'

import { useState, useTransition, useOptimistic, useRef, useEffect } from 'react'
import {
  addItem,
  deleteItem,
  toggleDone,
  updateItem,
  updateHeader,
  updatePriority,
  togglePin,
  signOut,
  type DisplayType,
} from '@/app/actions'
import { CategoryManager } from './CategoryManager'

type Item = {
  id: string
  category_id: string
  content: string
  is_done: boolean
  is_pinned: boolean
  priority: number | null
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
  parent_id: string | null
}

type OptimisticAction =
  | { type: 'add'; item: Item }
  | { type: 'delete'; id: string }
  | { type: 'toggle'; id: string; isDone: boolean }
  | { type: 'update'; id: string; content: string }
  | { type: 'priority'; id: string; priority: number }
  | { type: 'pin'; id: string; isPinned: boolean }

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
    case 'priority':
      return state.map((i) =>
        i.id === action.id ? { ...i, priority: action.priority } : i,
      )
    case 'pin':
      return state.map((i) =>
        i.id === action.id ? { ...i, is_pinned: action.isPinned } : i,
      )
  }
}

function sortItems(items: Item[], displayType: DisplayType): Item[] {
  const arr = [...items]
  switch (displayType) {
    case 'checklist':
      // 미완료 위로, 그 다음 최신순
      return arr.sort((a, b) => {
        if (a.is_done !== b.is_done) return a.is_done ? 1 : -1
        return b.created_at.localeCompare(a.created_at)
      })
    case 'priority':
      // priority 높은 순, null은 뒤로
      return arr.sort((a, b) => {
        const ap = a.priority ?? -1
        const bp = b.priority ?? -1
        if (ap !== bp) return bp - ap
        return b.created_at.localeCompare(a.created_at)
      })
    case 'rule':
      // 핀 위로, 그 다음 최신순
      return arr.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
        return b.created_at.localeCompare(a.created_at)
      })
    case 'list':
    default:
      // 최신순
      return arr.sort((a, b) => b.created_at.localeCompare(a.created_at))
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
  const [, startTransition] = useTransition()
  const [optimisticItems, applyOptimistic] = useOptimistic(items, reducer)
  const [optimisticHeader, applyOptimisticHeader] = useOptimistic(
    headerText,
    (_, next: string) => next,
  )

  const activeId =
    categories.find((c) => c.id === selectedId)?.id ??
    categories[0]?.id ??
    ''

  const activeMeta = categories.find((c) => c.id === activeId) ?? categories[0]
  const activeType = (activeMeta?.display_type ?? 'list') as DisplayType

  const filtered = sortItems(
    optimisticItems.filter((i) => i.category_id === activeId),
    activeType,
  )

  const isChecklist = activeType === 'checklist'
  const isPriority = activeType === 'priority'
  const isRule = activeType === 'rule'

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
          is_pinned: false,
          priority: null,
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

  function onChangePriority(id: string, priority: number) {
    startTransition(async () => {
      applyOptimistic({ type: 'priority', id, priority })
      await updatePriority(id, priority)
    })
  }

  function onTogglePin(id: string, current: boolean) {
    startTransition(async () => {
      applyOptimistic({ type: 'pin', id, isPinned: !current })
      await togglePin(id, !current)
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
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="text-warm-soft mb-4 text-sm">
          카테고리가 없어요. 먼저 카테고리를 추가해주세요.
        </p>
        <button
          onClick={() => setManagerOpen(true)}
          className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-300/50"
        >
          + 카테고리 추가
        </button>
        <CategoryManager
          open={managerOpen}
          onClose={() => setManagerOpen(false)}
          categories={categories}
        />
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md min-w-0 flex-col overflow-x-hidden px-4 pt-safe pb-safe-24">
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

      <section className="mb-7 min-w-0">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="section-label">카테고리</span>
        </div>
        <CategoryTabs
          categories={categories}
          activeId={activeId}
          onSelect={setSelectedId}
        />
      </section>

      <section className="mb-7 min-w-0">
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

      <section className="min-w-0">
        <div className="mb-3 flex items-end justify-between px-1">
          <div className="flex items-baseline gap-2">
            <span className="section-label">{activeMeta.name}</span>
            <span className="text-warm-soft text-[10px] uppercase tracking-wider opacity-70">
              {activeType}
            </span>
          </div>
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
              displayType={activeType}
              onDelete={onDelete}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onChangePriority={onChangePriority}
              onTogglePin={onTogglePin}
            />
          ))}
        </ul>

        {isPriority && filtered.length > 0 && (
          <p className="text-warm-soft mt-3 text-center text-[11px]">
            우선순위는 1~10. 클릭해서 변경
          </p>
        )}
        {isRule && filtered.length > 0 && (
          <p className="text-warm-soft mt-3 text-center text-[11px]">
            📌 클릭해서 중요한 규칙 상단 고정
          </p>
        )}
      </section>
    </main>
  )
}

function CategoryTabs({
  categories,
  activeId,
  onSelect,
}: {
  categories: Category[]
  activeId: string
  onSelect: (id: string) => void
}) {
  // 최상위 (parent_id === null), position 오름차순
  const topLevel = categories.filter((c) => c.parent_id === null)
  // 활성 카테고리의 부모 = 자식 행을 표시할 기준
  const active = categories.find((c) => c.id === activeId)
  const activeParentId = active
    ? active.parent_id ?? active.id
    : topLevel[0]?.id ?? null

  const childRow = activeParentId
    ? categories.filter((c) => c.parent_id === activeParentId)
    : []

  return (
    <div className="flex flex-col gap-1.5">
      <CategoryRow
        items={topLevel}
        activeId={activeParentId}
        onSelect={onSelect}
      />
      {childRow.length > 0 && (
        <CategoryRow
          items={childRow}
          activeId={activeId}
          onSelect={onSelect}
          variant="child"
        />
      )}
    </div>
  )
}

function CategoryRow({
  items,
  activeId,
  onSelect,
  variant = 'parent',
}: {
  items: Category[]
  activeId: string | null
  onSelect: (id: string) => void
  variant?: 'parent' | 'child'
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const isScrollable = items.length > 4

  useEffect(() => {
    if (!isScrollable || !activeId) return
    const tab = tabRefs.current.get(activeId)
    tab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeId, isScrollable])

  // 자식 행은 좀 더 컴팩트하고 다른 톤
  const wrapperClass =
    variant === 'parent'
      ? 'card rounded-2xl p-1.5'
      : 'card-subtle rounded-2xl p-1'

  if (!isScrollable) {
    return (
      <nav
        className={`grid gap-1 ${wrapperClass}`}
        style={{
          gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {items.map((c) => (
          <CategoryTab
            key={c.id}
            category={c}
            active={activeId === c.id}
            onClick={() => onSelect(c.id)}
            mode="grid"
            variant={variant}
          />
        ))}
      </nav>
    )
  }

  return (
    <div className="relative min-w-0">
      <nav
        ref={containerRef}
        className={`scrollbar-hide flex w-full min-w-0 gap-1 overflow-x-auto ${wrapperClass}`}
      >
        {items.map((c) => (
          <CategoryTab
            key={c.id}
            category={c}
            active={activeId === c.id}
            onClick={() => onSelect(c.id)}
            mode="scroll"
            variant={variant}
            ref={(el) => {
              if (el) tabRefs.current.set(c.id, el)
              else tabRefs.current.delete(c.id)
            }}
          />
        ))}
      </nav>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-2xl bg-gradient-to-l from-[#fff8ec] to-transparent" />
    </div>
  )
}

function CategoryTab({
  category,
  active,
  onClick,
  mode,
  variant = 'parent',
  ref,
}: {
  category: Category
  active: boolean
  onClick: () => void
  mode: 'grid' | 'scroll'
  variant?: 'parent' | 'child'
  ref?: (el: HTMLButtonElement | null) => void
}) {
  const isChild = variant === 'child'
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded-xl text-[11px] font-medium transition ${
        isChild ? 'flex-row py-1.5' : 'flex-col py-2.5'
      } ${
        mode === 'scroll'
          ? isChild
            ? 'min-w-[4rem] px-2.5'
            : 'min-w-[4.5rem] px-3'
          : isChild
            ? 'px-2'
            : 'px-2'
      } ${
        active
          ? 'card-active text-warm'
          : 'text-warm-soft hover:text-warm'
      }`}
    >
      <span className={isChild ? 'text-sm' : 'text-lg'}>{category.emoji}</span>
      <span className="truncate">{category.name}</span>
    </button>
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
  displayType,
  onDelete,
  onToggle,
  onUpdate,
  onChangePriority,
  onTogglePin,
}: {
  item: Item
  displayType: DisplayType
  onDelete: (id: string) => void
  onToggle: (id: string, current: boolean) => void
  onUpdate: (id: string, content: string) => void
  onChangePriority: (id: string, priority: number) => void
  onTogglePin: (id: string, current: boolean) => void
}) {
  const [editing, setEditing] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
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

  const isChecklist = displayType === 'checklist'
  const isPriority = displayType === 'priority'
  const isRule = displayType === 'rule'
  const isSaving = item.id.startsWith('temp-')
  const disableActions = editing || isSaving

  return (
    <li
      className={`card group flex items-center gap-3 rounded-2xl px-4 py-3.5 transition hover:card-active ${
        isRule && item.is_pinned ? 'border-orange-400/60 bg-orange-50/50' : ''
      } ${isSaving ? 'animate-pulse opacity-60' : ''}`}
    >
      {isChecklist && (
        <button
          onClick={() => onToggle(item.id, item.is_done)}
          disabled={disableActions}
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

      {isRule && (
        <button
          onClick={() => onTogglePin(item.id, item.is_pinned)}
          disabled={disableActions}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base transition ${
            item.is_pinned
              ? 'bg-orange-100 text-orange-600 shadow-sm shadow-orange-200/60'
              : 'text-stone-400 hover:bg-orange-50 hover:text-orange-500'
          }`}
          aria-label={item.is_pinned ? '핀 해제' : '핀 고정'}
          title={item.is_pinned ? '핀 해제' : '핀 고정'}
        >
          📌
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
          disabled={isSaving}
          className={`text-warm flex-1 min-w-0 cursor-text text-left text-sm whitespace-pre-wrap break-words ${
            isChecklist && item.is_done
              ? 'text-warm-soft line-through opacity-60'
              : ''
          }`}
        >
          {item.content}
        </button>
      )}

      {isPriority && !editing && (
        <div className="relative">
          <button
            onClick={() => setPriorityOpen((v) => !v)}
            disabled={isSaving}
            className={`flex h-7 min-w-[2rem] items-center justify-center rounded-full px-2 text-xs font-semibold transition ${
              item.priority
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-300/50'
                : 'card-subtle text-warm-soft'
            }`}
            aria-label="우선순위 변경"
          >
            {item.priority ?? '–'}
          </button>
          {priorityOpen && (
            <div className="absolute right-0 top-9 z-20 w-52 rounded-xl border-[1.5px] border-[#d4ad7a] bg-white p-2 shadow-lg">
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      onChangePriority(item.id, n)
                      setPriorityOpen(false)
                    }}
                    className={`flex aspect-square w-full items-center justify-center rounded-md text-xs font-semibold transition ${
                      item.priority === n
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm'
                        : 'text-warm-soft hover:bg-orange-50 hover:text-warm'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!editing && (
        <button
          onClick={() => onDelete(item.id)}
          disabled={isSaving}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base text-stone-400 transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
          aria-label="삭제"
        >
          ✕
        </button>
      )}
    </li>
  )
}
