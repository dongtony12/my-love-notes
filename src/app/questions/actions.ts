'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export type QuestionRow = Database['public']['Tables']['questions']['Row']

export async function createQuestion(content: string) {
  const trimmed = content.trim()
  if (!trimmed) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('questions')
    .insert({ user_id: user.id, content: trimmed })

  if (error) throw new Error(error.message)
  revalidatePath('/questions')
}

export async function updateQuestion(id: string, content: string) {
  const trimmed = content.trim()
  if (!trimmed) return

  const supabase = await createClient()
  const { error } = await supabase
    .from('questions')
    .update({ content: trimmed })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/questions')
}

export async function updateAnswer(id: string, answer: string) {
  const trimmed = answer.trim()
  const supabase = await createClient()
  const { error } = await supabase
    .from('questions')
    .update({ answer: trimmed || null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/questions')
}

export async function toggleAnswered(id: string, isAnswered: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('questions')
    .update({ is_answered: isAnswered })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/questions')
}

export async function deleteQuestion(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/questions')
}
