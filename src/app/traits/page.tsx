import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TraitsApp } from '@/components/TraitsApp'

export default async function TraitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: traits }, { data: profile }] = await Promise.all([
    supabase
      .from('traits')
      .select('id, label, content, is_pinned, position, created_at, updated_at')
      .order('is_pinned', { ascending: false })
      .order('position', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('cycle_days, last_period_date, cycle_variance')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return (
    <TraitsApp
      traits={traits ?? []}
      cycleDays={profile?.cycle_days ?? null}
      lastPeriodDate={profile?.last_period_date ?? null}
      cycleVariance={profile?.cycle_variance ?? 3}
    />
  )
}
