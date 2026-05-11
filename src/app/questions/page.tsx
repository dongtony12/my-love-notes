import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { QuestionsApp } from '@/components/QuestionsApp'

export default async function QuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, content, answer, is_answered, created_at, updated_at')
    .order('created_at', { ascending: false })

  return <QuestionsApp questions={questions ?? []} />
}
