'use client';

interface Props { current: number; total: number; }

export default function ProgressBar({ current, total }: Props) {
  const pct = total <= 1 ? 100 : Math.round((current / (total - 1)) * 100);

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--track-bg)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: 'var(--primary)',
            transition: 'width var(--t-base)',
          }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[var(--fs-xs)] text-[var(--muted)]">Progresso</span>
        <span className="text-[var(--fs-xs)] font-semibold text-[var(--primary)]">{pct}%</span>
      </div>
    </div>
  );
}
