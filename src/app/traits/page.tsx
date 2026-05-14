import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TraitsApp } from '@/components/TraitsApp'

export default async function TraitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: traits } = await supabase
    .from('traits')
    .select('id, label, content, is_pinned, position, created_at, updated_at')
    .order('is_pinned', { ascending: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })

  return <TraitsApp traits={traits ?? []} />
}
