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
