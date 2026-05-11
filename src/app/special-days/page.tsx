import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SpecialDaysApp } from '@/components/SpecialDaysApp'

export default async function SpecialDaysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: days } = await supabase
    .from('special_days')
    .select('id, date, title, content, emoji, created_at, updated_at')
    .order('date', { ascending: false })

  return <SpecialDaysApp days={days ?? []} />
}
