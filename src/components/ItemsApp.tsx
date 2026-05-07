'use client'

import { useState, useTransition } from 'react'
import { addItem, deleteItem, toggleDone, signOut, type Category } from '@/app/actions'

type Item = {
  id: string
  category: Category
  content: string
  is_done: boolean
  created_at: string
}

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'dont', label: '하지 말 것', emoji: '🚫' },
  { key: 'like', label: '좋아하는 것', emoji: '❤️' },
  { key: 'dislike', label: '싫어하는 것', emoji: '👎' },
  { key: 'wishlist', label: '같이 할 것', emoji: '✨' },
]

export function ItemsApp({ items }: { items: Item[] }) {
  const [active, setActive] = useState<Category>('dont')
  const [draft, setDraft] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = items.filter((i) => i.category === active)
  const activeMeta = CATEGORIES.find((c) => c.key === active)!

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = draft
    if (!text.trim()) return
    setDraft('')
    startTransition(async () => {
      await addItem(active, text)
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteItem(id)
    })
  }

  function onToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleDone(id, !current)
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-24 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">my love notes</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            로그아웃
          </button>
        </form>
      </header>

      <nav className="mb-6 grid grid-cols-4 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setActive(c.key)}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition ${
              active === c.key
                ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <span className="text-base">{c.emoji}</span>
            <span className="truncate">{c.label}</span>
          </button>
        ))}
      </nav>

      <form onSubmit={onAdd} className="mb-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`${activeMeta.label} 추가...`}
          className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-4 py-3 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          추가
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <li className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
            아직 항목이 없어요
          </li>
        )}
        {filtered.map((item) => (
          <li
            key={item.id}
            className="group flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950"
          >
            {active === 'wishlist' && (
              <button
                onClick={() => onToggle(item.id, item.is_done)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                  item.is_done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}
                aria-label="완료 토글"
              >
                {item.is_done && <span className="text-xs">✓</span>}
              </button>
            )}
            <span
              className={`flex-1 text-sm ${
                active === 'wishlist' && item.is_done
                  ? 'text-neutral-400 line-through'
                  : ''
              }`}
            >
              {item.content}
            </span>
            <button
              onClick={() => onDelete(item.id)}
              className="text-xs text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
              aria-label="삭제"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
