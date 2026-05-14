'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Stage = 'email' | 'code'

export default function LoginPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (stage === 'code') {
      codeRef.current?.focus()
    }
  }, [stage])

  async function sendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Supabase는 OTP 호출 시 코드와 매직링크 둘 다 생성. 이메일 템플릿이
        // {{ .Token }} 노출하면 사용자는 6자리 코드만 보게 됨.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('idle')
      setStage('code')
    }
  }

  async function verifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      router.replace('/')
      router.refresh()
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
            {stage === 'email'
              ? '이메일로 인증 코드를 받으세요'
              : `${email} 으로 보낸 코드 입력`}
          </p>
        </div>

        {stage === 'email' ? (
          <form onSubmit={sendCode} className="space-y-3">
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
              disabled={status === 'loading' || !email.trim()}
              className="w-full rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-4 py-3 text-base font-semibold text-white shadow-md shadow-orange-300/50 transition hover:shadow-lg hover:shadow-orange-300/70 disabled:opacity-40 disabled:shadow-none"
            >
              {status === 'loading' ? '보내는 중...' : '코드 받기'}
            </button>
            {status === 'error' && (
              <p className="text-center text-sm text-red-500">{errorMsg}</p>
            )}
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-3">
            <input
              ref={codeRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6자리 코드"
              maxLength={6}
              className="input text-warm w-full rounded-2xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-semibold"
            />
            <button
              type="submit"
              disabled={status === 'loading' || code.length < 6}
              className="w-full rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-4 py-3 text-base font-semibold text-white shadow-md shadow-orange-300/50 transition hover:shadow-lg hover:shadow-orange-300/70 disabled:opacity-40 disabled:shadow-none"
            >
              {status === 'loading' ? '확인 중...' : '로그인'}
            </button>
            {status === 'error' && (
              <p className="text-center text-sm text-red-500">{errorMsg}</p>
            )}
            <button
              type="button"
              onClick={() => {
                setStage('email')
                setCode('')
                setStatus('idle')
                setErrorMsg('')
              }}
              className="text-warm-soft hover:text-warm w-full text-center text-xs"
            >
              ← 이메일 다시 입력
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
