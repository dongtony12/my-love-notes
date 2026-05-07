import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ItemsApp } from '@/components/ItemsApp'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: items } = await supabase
    .from('items')
    .select('id, category, content, is_done, created_at')
    .order('created_at', { ascending: false })

  return <ItemsApp items={items ?? []} />
}
