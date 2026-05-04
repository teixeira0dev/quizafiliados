'use client';

import type { CSSProperties } from 'react';

interface Props {
  label: string;
  onClick: () => void;
  color?: string;
  variant?: 'default' | 'pulse' | 'fixed';
  'data-testid'?: string;
}

export default function CTAButton({
  label,
  onClick,
  color,
  variant = 'pulse',
  'data-testid': testId,
}: Props) {
  const bg = color ?? 'var(--red)';
  const isFixed = variant === 'fixed';
  const isPulse = variant === 'pulse' && !isFixed;

  /* Deriva o glow do background — verde, vermelho, ou genérico */
  const glow = bg.includes('green') ? 'var(--green-glow)' : 'var(--red-glow)';
  const style = {
    backgroundColor: bg,
    '--btn-glow': glow,
    boxShadow: isFixed
      ? `0 -10px 28px rgba(0,0,0,0.55), 0 6px 20px -4px ${glow}`
      : `0 10px 28px -6px ${glow}`,
  } as CSSProperties;

  return (
    <button
      onClick={onClick}
      data-testid={testId ?? 'cta-button'}
      data-cta-target={isFixed ? undefined : ''}
      className={[
        'btn-cta',
        isFixed ? 'btn-cta--fixed' : '',
        isPulse ? 'animate-pulse-btn' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <span dangerouslySetInnerHTML={{ __html: label }} />
    </button>
  );
}
