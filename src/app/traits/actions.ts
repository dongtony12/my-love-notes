'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export type TraitRow = Database['public']['Tables']['traits']['Row']

export async function createTrait(input: {
  label: string
  content: string
  isPinned: boolean
}) {
  const label = input.label.trim()
  if (!label) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 같은 그룹(pin/unpinned)에서 마지막 position +1
  const { data: maxRow } = await supabase
    .from('traits')
    .select('position')
    .eq('user_id', user.id)
    .eq('is_pinned', input.isPinned)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPosition = (maxRow?.position ?? -1) + 1

  const { error } = await supabase.from('traits').insert({
    user_id: user.id,
    label,
    content: input.content.trim(),
    is_pinned: input.isPinned,
    position: nextPosition,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/traits')
}

export async function updateTrait(
  id: string,
  patch: { label?: string; content?: string },
) {
  const update: Database['public']['Tables']['traits']['Update'] = {}
  if (patch.label !== undefined) {
    const trimmed = patch.label.trim()
    if (!trimmed) return
    update.label = trimmed
  }
  if (patch.content !== undefined) {
    update.content = patch.content.trim()
  }
  if (Object.keys(update).length === 0) return

  const supabase = await createClient()
  const { error } = await supabase.from('traits').update(update).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/traits')
}

export async function togglePin(id: string, isPinned: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('traits')
    .update({ is_pinned: isPinned })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/traits')
}

export async function deleteTrait(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('traits').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/traits')
}
