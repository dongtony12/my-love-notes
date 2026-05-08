import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ItemsApp } from '@/components/ItemsApp'

const DEFAULT_HEADER = '🧡 my love notes'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: items }, { data: categories }, { data: profile }] =
    await Promise.all([
      supabase
        .from('items')
        .select(
          'id, category_id, content, is_done, is_pinned, priority, created_at, updated_at',
        )
        .order('created_at', { ascending: false }),
      supabase
        .from('categories')
        .select('id, name, emoji, display_type, position, is_default, parent_id')
        .order('position', { ascending: true }),
      supabase
        .from('profiles')
        .select('header_text')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

  return (
    <ItemsApp
      items={items ?? []}
      categories={categories ?? []}
      headerText={profile?.header_text ?? DEFAULT_HEADER}
    />
  )
}
