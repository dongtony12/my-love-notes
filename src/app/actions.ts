'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export type DisplayType = 'list' | 'checklist' | 'priority' | 'rule'
export type CategoryRow = Database['public']['Tables']['categories']['Row']
export type ItemRow = Database['public']['Tables']['items']['Row']

export async function addItem(categoryId: string, content: string) {
  const trimmed = content.trim()
  if (!trimmed) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('items')
    .insert({ user_id: user.id, category_id: categoryId, content: trimmed })

  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function deleteItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function toggleDone(id: string, isDone: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('items')
    .update({ is_done: isDone })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function updateItem(id: string, content: string) {
  const trimmed = content.trim()
  if (!trimmed) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('items')
    .update({ content: trimmed })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function updatePriority(id: string, priority: number) {
  const clamped = Math.min(10, Math.max(1, Math.round(priority)))
  const supabase = await createClient()
  const { error } = await supabase
    .from('items')
    .update({ priority: clamped })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function togglePin(id: string, isPinned: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('items')
    .update({ is_pinned: isPinned })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function updateHeader(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, header_text: trimmed }, { onConflict: 'user_id' })

  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function createCategory(input: {
  name: string
  emoji: string
  displayType: DisplayType
  parentId?: string | null
}) {
  const name = input.name.trim()
  const emoji = input.emoji.trim() || '📌'
  if (!name) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 같은 그룹(같은 parent_id 또는 둘 다 NULL) 안에서 가장 큰 position +1
  const parentFilter = supabase
    .from('categories')
    .select('position')
    .eq('user_id', user.id)
    .order('position', { ascending: false })
    .limit(1)

  const { data: maxRow } = await (input.parentId
    ? parentFilter.eq('parent_id', input.parentId)
    : parentFilter.is('parent_id', null)
  ).maybeSingle()

  const nextPosition = (maxRow?.position ?? -1) + 1

  const { error } = await supabase.from('categories').insert({
    user_id: user.id,
    name,
    emoji,
    display_type: input.displayType,
    position: nextPosition,
    is_default: false,
    parent_id: input.parentId ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function updateCategory(
  id: string,
  patch: {
    name?: string
    emoji?: string
    displayType?: DisplayType
    parentId?: string | null
  },
) {
  const update: Database['public']['Tables']['categories']['Update'] = {}
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim()
    if (!trimmed) return
    update.name = trimmed
  }
  if (patch.emoji !== undefined) {
    update.emoji = patch.emoji.trim() || '📌'
  }
  if (patch.displayType !== undefined) {
    update.display_type = patch.displayType
  }
  if (patch.parentId !== undefined) {
    update.parent_id = patch.parentId
  }
  if (Object.keys(update).length === 0) return

  const supabase = await createClient()
  const { error } = await supabase.from('categories').update(update).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function reorderCategories(orderedIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 한 번의 트랜잭션처럼: 순서대로 position 업데이트
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('categories')
      .update({ position: i })
      .eq('id', orderedIds[i])
      .eq('user_id', user.id)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/')
}
