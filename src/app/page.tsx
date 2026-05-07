import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ItemsApp } from '@/components/ItemsApp'

const DEFAULT_HEADER = '🧡 my love notes'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: items }, { data: profile }] = await Promise.all([
    supabase
      .from('items')
      .select('id, category, content, is_done, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('header_text')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return (
    <ItemsApp
      items={items ?? []}
      headerText={profile?.header_text ?? DEFAULT_HEADER}
    />
  )
}
