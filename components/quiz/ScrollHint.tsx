'use client';

import { useEffect, useState } from 'react';

/**
 * Mostra uma seta sutil apontando para baixo quando existe um CTA
 * (não-fixo) abaixo da dobra da tela. Some quando o usuário rola
 * ou quando o CTA entra em viewport.
 */
export default function ScrollHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let hasScrolled = false;
    let observer: IntersectionObserver | null = null;
    const timers: number[] = [];

    const onScroll = () => {
      if (window.scrollY > 30) {
        hasScrolled = true;
        setShow(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const attach = (attemptsLeft: number) => {
      if (cancelled) return;
      const target = document.querySelector('[data-cta-target]');
      if (!target) {
        /* DOM ainda não está pronto (framer-motion em transição). Retenta. */
        if (attemptsLeft > 0) {
          timers.push(window.setTimeout(() => attach(attemptsLeft - 1), 200));
        } else {
          setShow(false);
        }
        return;
      }
      observer = new IntersectionObserver(
        ([entry]) => {
          if (hasScrolled) return;
          setShow(!entry.isIntersecting);
        },
        { threshold: 0.4 },
      );
      observer.observe(target);
    };

    /* Primeira tentativa logo após framer-motion estabilizar.
       Retenta até 5x (1s total) caso o DOM ainda não tenha o CTA. */
    timers.push(window.setTimeout(() => attach(5), 250));

    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
      window.removeEventListener('scroll', onScroll);
      observer?.disconnect();
    };
  }, []);

  if (!show) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 z-40 pointer-events-none flex justify-center"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className="animate-bounce-down flex items-center justify-center rounded-full"
        style={{
          width: 44,
          height: 44,
          background: 'rgba(255, 51, 51, 0.18)',
          border: '1px solid rgba(255, 51, 51, 0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 9l6 6 6-6"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
