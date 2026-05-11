'use client'

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import {
  createQuestion,
  deleteQuestion,
  toggleAnswered,
  updateAnswer,
  updateQuestion,
} from '@/app/questions/actions'

type Question = {
  id: string
  content: string
  answer: string | null
  is_answered: boolean
  created_at: string
  updated_at: string
}

type OptimisticAction =
  | { type: 'add'; question: Question }
  | { type: 'content'; id: string; content: string }
  | { type: 'answer'; id: string; answer: string | null }
  | { type: 'toggle'; id: string; isAnswered: boolean }
  | { type: 'delete'; id: string }

function reducer(state: Question[], action: OptimisticAction): Question[] {
  switch (action.type) {
    case 'add':
      return [action.question, ...state]
    case 'content':
      return state.map((q) =>
        q.id === action.id ? { ...q, content: action.content } : q,
      )
    case 'answer':
      return state.map((q) =>
        q.id === action.id ? { ...q, answer: action.answer } : q,
      )
    case 'toggle':
      return state.map((q) =>
        q.id === action.id ? { ...q, is_answered: action.isAnswered } : q,
      )
    case 'delete':
      return state.filter((q) => q.id !== action.id)
  }
}

function sortQuestions(qs: Question[]): Question[] {
  return [...qs].sort((a, b) => {
    // 미답변 위
    if (a.is_answered !== b.is_answered) return a.is_answered ? 1 : -1
    // 같은 그룹 내 최신순
    return b.created_at.localeCompare(a.created_at)
  })
}

export function QuestionsApp({ questions }: { questions: Question[] }) {
  const [draft, setDraft] = useState('')
  const [optimisticQs, applyOptimistic] = useOptimistic(questions, reducer)
  const [, startTransition] = useTransition()

  const sorted = sortQuestions(optimisticQs)
  const answeredCount = optimisticQs.filter((q) => q.is_answered).length

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const content = draft.trim()
    if (!content) return
    setDraft('')
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    startTransition(async () => {
      applyOptimistic({
        type: 'add',
        question: {
          id: tempId,
          content,
          answer: null,
          is_answered: false,
          created_at: now,
          updated_at: now,
        },
      })
      await createQuestion(content)
    })
  }

  function onToggle(id: string, current: boolean) {
    if (id.startsWith('temp-')) return
    startTransition(async () => {
      applyOptimistic({ type: 'toggle', id, isAnswered: !current })
      await toggleAnswered(id, !current)
    })
  }

  function onUpdateContent(id: string, content: string) {
    if (id.startsWith('temp-')) return
    const trimmed = content.trim()
    if (!trimmed) return
    startTransition(async () => {
      applyOptimistic({ type: 'content', id, content: trimmed })
      await updateQuestion(id, trimmed)
    })
  }

  function onUpdateAnswer(id: string, answer: string) {
    if (id.startsWith('temp-')) return
    const trimmed = answer.trim()
    startTransition(async () => {
      applyOptimistic({ type: 'answer', id, answer: trimmed || null })
      await updateAnswer(id, trimmed)
    })
  }

  function onDelete(id: string) {
    if (id.startsWith('temp-')) return
    startTransition(async () => {
      applyOptimistic({ type: 'delete', id })
      await deleteQuestion(id)
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md min-w-0 flex-col overflow-x-hidden px-4 pb-32 pt-8">
      <header className="mb-6">
        <h1 className="text-warm text-xl font-bold tracking-tight">
          🤔 궁금한 질문
        </h1>
      </header>

      <section className="mb-6 min-w-0">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="section-label">추가하기</span>
        </div>
        <form
          onSubmit={onAdd}
          className="flex items-center gap-1.5 rounded-2xl border-[1.5px] border-[#d4ad7a] bg-white/60 p-1.5 transition-all hover:border-[#b8884f] focus-within:border-orange-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(254,215,170,0.5)]"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="물어보고 싶은 질문..."
            className="text-warm flex-1 rounded-xl bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-300/50 transition hover:shadow-lg hover:shadow-orange-300/70 disabled:opacity-40 disabled:shadow-none"
          >
            추가
          </button>
        </form>
      </section>

      <section className="min-w-0">
        <div className="mb-3 flex items-end justify-between px-1">
          <span className="section-label">질문</span>
          <span className="text-warm-soft text-xs">
            {optimisticQs.length > 0
              ? `${answeredCount} / ${optimisticQs.length}개 답변`
              : '0개'}
          </span>
        </div>

        <ul className="flex flex-col gap-2.5">
          {sorted.length === 0 && (
            <li className="card-subtle text-warm-soft rounded-2xl p-10 text-center text-sm">
              🤔 아직 질문이 없어요
            </li>
          )}
          {sorted.map((q) => (
            <QuestionRow
              key={q.id}
              question={q}
              onToggle={onToggle}
              onUpdateContent={onUpdateContent}
              onUpdateAnswer={onUpdateAnswer}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </section>
    </main>
  )
}

function QuestionRow({
  question,
  onToggle,
  onUpdateContent,
  onUpdateAnswer,
  onDelete,
}: {
  question: Question
  onToggle: (id: string, current: boolean) => void
  onUpdateContent: (id: string, content: string) => void
  onUpdateAnswer: (id: string, answer: string) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [answerEditing, setAnswerEditing] = useState(false)
  const [draft, setDraft] = useState(question.content)
  const [answerDraft, setAnswerDraft] = useState(question.answer ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const answerRef = useRef<HTMLTextAreaElement>(null)

  const isSaving = question.id.startsWith('temp-')
  const disableActions = editing || answerEditing || isSaving

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    if (answerEditing) {
      answerRef.current?.focus()
    }
  }, [answerEditing])

  function commitContent() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== question.content) {
      onUpdateContent(question.id, trimmed)
    } else {
      setDraft(question.content)
    }
    setEditing(false)
  }

  function commitAnswer() {
    onUpdateAnswer(question.id, answerDraft)
    setAnswerEditing(false)
  }

  function onKeyDownContent(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitContent()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDraft(question.content)
      setEditing(false)
    }
  }

  return (
    <li
      className={`card group rounded-2xl px-4 py-3.5 transition hover:card-active ${
        isSaving ? 'animate-pulse opacity-60' : ''
      } ${question.is_answered ? 'bg-orange-50/30' : ''}`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => onToggle(question.id, question.is_answered)}
          disabled={disableActions}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
            question.is_answered
              ? 'border-orange-400 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-orange-300/50'
              : 'border-stone-300'
          }`}
          aria-label="답변 여부"
        >
          {question.is_answered && (
            <span className="text-xs leading-none">✓</span>
          )}
        </button>

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDownContent}
            onBlur={commitContent}
            className="text-warm flex-1 rounded-md border-[1.5px] border-orange-400 bg-white px-2 py-1 text-sm outline-none shadow-[0_0_0_3px_rgba(254,215,170,0.5)]"
          />
        ) : (
          <button
            type="button"
            onClick={() => !isSaving && setEditing(true)}
            disabled={isSaving}
            className={`text-warm flex-1 min-w-0 cursor-text text-left text-sm whitespace-pre-wrap break-words ${
              question.is_answered ? 'text-warm-soft opacity-70' : ''
            }`}
          >
            {question.content}
          </button>
        )}

        {!editing && !answerEditing && (
          <button
            onClick={() => onDelete(question.id)}
            disabled={isSaving}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base text-stone-400 transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
            aria-label="삭제"
          >
            ✕
          </button>
        )}
      </div>

      {/* 답변 영역 */}
      {answerEditing ? (
        <div className="mt-3 ml-8">
          <textarea
            ref={answerRef}
            value={answerDraft}
            onChange={(e) => setAnswerDraft(e.target.value)}
            placeholder="답변 메모 (선택)"
            maxLength={300}
            rows={2}
            className="input text-warm w-full resize-none rounded-xl px-3 py-2 text-xs leading-relaxed"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={commitAnswer}
              className="flex-1 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 py-1.5 text-xs font-semibold text-white shadow-sm shadow-orange-300/50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setAnswerDraft(question.answer ?? '')
                setAnswerEditing(false)
              }}
              className="card-subtle text-warm-soft flex-1 rounded-lg py-1.5 text-xs"
            >
              취소
            </button>
          </div>
        </div>
      ) : question.answer ? (
        <button
          type="button"
          onClick={() => !isSaving && setAnswerEditing(true)}
          disabled={isSaving}
          className="text-warm-soft mt-2 ml-8 block cursor-text rounded-lg border-l-2 border-orange-200 bg-orange-50/40 px-2 py-1.5 text-left text-xs leading-relaxed whitespace-pre-wrap break-words"
        >
          💬 {question.answer}
        </button>
      ) : (
        !editing &&
        !isSaving && (
          <button
            type="button"
            onClick={() => setAnswerEditing(true)}
            className="text-warm-soft mt-2 ml-8 text-[11px] opacity-0 transition hover:text-warm group-hover:opacity-100"
          >
            + 답변 메모
          </button>
        )
      )}
    </li>
  )
}
