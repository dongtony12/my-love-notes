import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function QuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-32 pt-8">
      <header className="mb-7">
        <h1 className="text-warm text-xl font-bold tracking-tight">
          🤔 궁금한 질문
        </h1>
      </header>

      <section className="card-subtle text-warm-soft rounded-2xl p-10 text-center text-sm">
        곧 만들어집니다
        <p className="mt-1 text-xs opacity-70">
          애인에게 물어보고 싶은 질문들
        </p>
      </section>
    </main>
  )
}
