// 라우트별 loading.tsx에서 사용하는 스켈레톤 UI들
// 실제 페이지 구조와 비슷한 모양으로 흔적만 표시해서 체감속도 끌어올림

function Pulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-stone-200/60 ${className}`} />
}

export function ItemsSkeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md min-w-0 flex-col overflow-x-hidden px-4 pb-24 pt-8">
      <header className="mb-7 flex items-center justify-between gap-2">
        <Pulse className="h-7 w-40" />
        <div className="flex gap-1.5">
          <Pulse className="h-8 w-8 rounded-full" />
          <Pulse className="h-7 w-16 rounded-full" />
        </div>
      </header>

      <section className="mb-7">
        <Pulse className="mb-2 h-3 w-16" />
        <div className="card grid grid-cols-4 gap-1 rounded-2xl p-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Pulse key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </section>

      <section className="mb-7">
        <Pulse className="mb-2 h-3 w-16" />
        <Pulse className="h-12 rounded-2xl" />
      </section>

      <section>
        <Pulse className="mb-3 h-3 w-20" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Pulse key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      </section>
    </main>
  )
}

export function SpecialDaysSkeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md min-w-0 flex-col overflow-x-hidden px-4 pb-32 pt-8">
      <header className="mb-6 flex items-center justify-between gap-2">
        <Pulse className="h-7 w-32" />
        <Pulse className="h-7 w-16 rounded-full" />
      </header>

      <section>
        <Pulse className="mb-3 h-3 w-12" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Pulse key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </section>
    </main>
  )
}

export function QuestionsSkeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md min-w-0 flex-col overflow-x-hidden px-4 pb-32 pt-8">
      <header className="mb-6">
        <Pulse className="h-7 w-36" />
      </header>

      <section className="mb-6">
        <Pulse className="mb-2 h-3 w-16" />
        <Pulse className="h-12 rounded-2xl" />
      </section>

      <section>
        <Pulse className="mb-3 h-3 w-12" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Pulse key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      </section>
    </main>
  )
}
