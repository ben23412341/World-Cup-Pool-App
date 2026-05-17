'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getOwnerPool(poolCode: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: pool } = await supabase
    .from('pools')
    .select('id, owner_id, join_code')
    .eq('join_code', poolCode.toUpperCase())
    .maybeSingle()

  if (!pool) return { error: 'Pool not found' as const }
  if (pool.owner_id !== user.id) return { error: 'Not authorized' as const }

  return { pool, supabase }
}

function revalidateBonus(joinCode: string) {
  const c = joinCode.toUpperCase()
  revalidatePath(`/pools/${c}/leaderboard`)
  revalidatePath(`/pools/${c}/leaderboard/bonus`)
}

export async function setBonusCorrectAnswer(
  poolCode: string,
  questionIndex: number,
  answerText: string | null,
  answerNumber: number | null,
): Promise<{ error?: string }> {
  const r = await getOwnerPool(poolCode)
  if ('error' in r) return { error: r.error }
  const { pool, supabase } = r

  const { error } = await supabase
    .from('bonus_correct_answers')
    .upsert(
      {
        pool_id: pool.id,
        question_index: questionIndex,
        answer_text: answerText,
        answer_number: answerNumber,
      },
      { onConflict: 'pool_id,question_index' },
    )

  if (error) return { error: error.message }

  revalidateBonus(pool.join_code as string)
  return {}
}

export async function markEntryAnswer(
  poolCode: string,
  entryId: string,
  questionIndex: number,
  isCorrect: boolean | null,
): Promise<{ error?: string }> {
  const r = await getOwnerPool(poolCode)
  if ('error' in r) return { error: r.error }
  const { pool, supabase } = r

  const { error } = await supabase
    .from('entry_bonus_answers')
    .update({ is_correct: isCorrect })
    .eq('entry_id', entryId)
    .eq('question_index', questionIndex)

  if (error) return { error: error.message }

  revalidateBonus(pool.join_code as string)
  return {}
}

export async function finalizeBonusPool(poolCode: string): Promise<{ error?: string }> {
  const r = await getOwnerPool(poolCode)
  if ('error' in r) return { error: r.error }
  const { pool, supabase } = r

  const { error } = await supabase
    .from('pools')
    .update({ bonus_finalized: true })
    .eq('id', pool.id)

  if (error) return { error: error.message }

  revalidateBonus(pool.join_code as string)
  return {}
}

export async function unfinalizeBonusPool(poolCode: string): Promise<{ error?: string }> {
  const r = await getOwnerPool(poolCode)
  if ('error' in r) return { error: r.error }
  const { pool, supabase } = r

  const { error } = await supabase
    .from('pools')
    .update({ bonus_finalized: false })
    .eq('id', pool.id)

  if (error) return { error: error.message }

  revalidateBonus(pool.join_code as string)
  return {}
}
