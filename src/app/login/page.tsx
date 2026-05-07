'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">my love notes</h1>
          <p className="text-sm text-neutral-500">이메일로 로그인 링크를 받으세요</p>
        </div>

        {status === 'sent' ? (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-center text-sm">
            <strong>{email}</strong> 으로 로그인 링크를 보냈어요.
            <br />
            메일함을 확인해주세요.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-neutral-300 bg-transparent px-4 py-3 text-base outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white transition disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            >
              {status === 'loading' ? '보내는 중...' : '로그인 링크 받기'}
            </button>
            {status === 'error' && (
              <p className="text-sm text-red-500">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
