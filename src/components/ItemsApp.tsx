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
  const doneCount =
    active === 'wishlist' ? filtered.filter((i) => i.is_done).length : 0

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-24 pt-8">
      {/* 헤더 섹션 */}
      <header className="mb-7 flex items-center justify-between">
        <h1 className="text-warm text-xl font-bold tracking-tight">
          🧡 my love notes
        </h1>
        <form action={signOut}>
          <button
            type="submit"
            className="card-subtle text-warm-soft rounded-full px-3 py-1 text-xs transition hover:[background:#ffffff]"
          >
            로그아웃
          </button>
        </form>
      </header>

      {/* 카테고리 섹션 */}
      <section className="mb-7">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="section-label">카테고리</span>
        </div>
        <nav className="card grid grid-cols-4 gap-1 rounded-2xl p-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium transition ${
                active === c.key
                  ? 'card-active text-warm'
                  : 'text-warm-soft hover:text-warm'
              }`}
            >
              <span className="text-lg">{c.emoji}</span>
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </nav>
      </section>

      {/* 추가 섹션 */}
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
            placeholder={`${activeMeta.label} 추가...`}
            className="text-warm flex-1 rounded-xl bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={isPending || !draft.trim()}
            className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-300/50 transition hover:shadow-lg hover:shadow-orange-300/70 disabled:opacity-40 disabled:shadow-none"
          >
            추가
          </button>
        </form>
      </section>

      {/* 리스트 섹션 */}
      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <div className="flex items-baseline gap-2">
            <span className="section-label">{activeMeta.label}</span>
          </div>
          <span className="text-warm-soft text-xs">
            {active === 'wishlist' && filtered.length > 0
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
            <li
              key={item.id}
              className="card group flex items-center gap-3 rounded-2xl px-4 py-3.5 transition hover:card-active"
            >
              {active === 'wishlist' && (
                <button
                  onClick={() => onToggle(item.id, item.is_done)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    item.is_done
                      ? 'border-orange-400 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-300/50'
                      : 'border-stone-300'
                  }`}
                  aria-label="완료 토글"
                >
                  {item.is_done && (
                    <span className="text-xs leading-none">✓</span>
                  )}
                </button>
              )}
              <span
                className={`text-warm flex-1 text-sm ${
                  active === 'wishlist' && item.is_done
                    ? 'text-warm-soft line-through opacity-60'
                    : ''
                }`}
              >
                {item.content}
              </span>
              <button
                onClick={() => onDelete(item.id)}
                className="text-warm-soft rounded-full px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
                aria-label="삭제"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
