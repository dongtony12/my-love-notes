import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function SpecialDaysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-32 pt-8">
      <header className="mb-7">
        <h1 className="text-warm text-xl font-bold tracking-tight">
          💝 특별한 날
        </h1>
      </header>

      <section className="card-subtle text-warm-soft rounded-2xl p-10 text-center text-sm">
        곧 만들어집니다
        <p className="mt-1 text-xs opacity-70">
          기억하고 싶은 날을 짧게 기록해요
        </p>
      </section>
    </main>
  )
}
