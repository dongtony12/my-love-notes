'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export type SpecialDayRow = Database['public']['Tables']['special_days']['Row']

export async function createSpecialDay(input: {
  date: string
  title: string
  emoji: string
  content?: string
}) {
  const title = input.title.trim()
  if (!title || !input.date) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('special_days').insert({
    user_id: user.id,
    date: input.date,
    title,
    emoji: input.emoji.trim() || '💝',
    content: input.content?.trim() || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/special-days')
}

export async function updateSpecialDay(
  id: string,
  patch: { date?: string; title?: string; emoji?: string; content?: string | null },
) {
  const update: Database['public']['Tables']['special_days']['Update'] = {}
  if (patch.date !== undefined) update.date = patch.date
  if (patch.title !== undefined) {
    const trimmed = patch.title.trim()
    if (!trimmed) return
    update.title = trimmed
  }
  if (patch.emoji !== undefined) update.emoji = patch.emoji.trim() || '💝'
  if (patch.content !== undefined) {
    update.content = patch.content?.trim() || null
  }
  if (Object.keys(update).length === 0) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('special_days')
    .update(update)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/special-days')
}

export async function deleteSpecialDay(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('special_days').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/special-days')
}
