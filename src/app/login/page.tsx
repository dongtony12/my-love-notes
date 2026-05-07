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
      <div className="card w-full max-w-sm space-y-6 rounded-3xl p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-warm text-2xl font-bold tracking-tight">
            🧡 my love notes
          </h1>
          <p className="text-warm-soft text-sm">
            이메일로 로그인 링크를 받으세요
          </p>
        </div>

        {status === 'sent' ? (
          <div className="card-subtle text-warm rounded-2xl p-4 text-center text-sm">
            <strong className="font-semibold">{email}</strong> 으로
            <br />
            로그인 링크를 보냈어요 ✉️
            <p className="text-warm-soft mt-1 text-xs">
              메일함을 확인해주세요
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input text-warm w-full rounded-2xl px-4 py-3 text-base"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-4 py-3 text-base font-semibold text-white shadow-md shadow-orange-300/50 transition hover:shadow-lg hover:shadow-orange-300/70 disabled:opacity-40 disabled:shadow-none"
            >
              {status === 'loading' ? '보내는 중...' : '로그인 링크 받기'}
            </button>
            {status === 'error' && (
              <p className="text-center text-sm text-red-500">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
