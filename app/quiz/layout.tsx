export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    /* Coluna única centralizada. Padding fixo — uma diagramação só. */
    <div
      className="box-border flex min-h-svh w-full justify-center pb-7"
      style={{
        paddingLeft:  'var(--sp-4)',
        paddingRight: 'var(--sp-4)',
        paddingTop:   'var(--sp-6)',
      }}
    >
      <main className="flex w-full max-w-[var(--max-w)] flex-col gap-5 pb-28">
        {children}
      </main>
    </div>
  );
}
