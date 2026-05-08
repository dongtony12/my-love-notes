'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: '메모', emoji: '📋' },
  { href: '/special-days', label: '특별한 날', emoji: '💝' },
  { href: '/questions', label: '질문', emoji: '🤔' },
] as const

function isHidden(pathname: string) {
  return pathname.startsWith('/login') || pathname.startsWith('/auth')
}

function isActive(href: string, pathname: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav() {
  const pathname = usePathname()
  if (isHidden(pathname)) return null

  return (
    <nav
      aria-label="주요 페이지"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md justify-around border-t border-[#efd6b3] bg-[#fff8ec]/85 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href, pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition ${
              active ? 'text-warm' : 'text-warm-soft'
            }`}
          >
            <span
              className={`text-xl transition ${active ? 'scale-110' : 'opacity-70'}`}
            >
              {tab.emoji}
            </span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
