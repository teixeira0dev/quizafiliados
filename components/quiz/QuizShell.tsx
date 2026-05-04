'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuizStore } from '@/lib/quiz-store';
import { STEPS } from '@/lib/steps';
import type { MediaOverrides } from '@/lib/media-overrides';
import type { CopyOverrides } from '@/lib/copy-overrides';
import QuizStep from './QuizStep';
import ScrollHint from './ScrollHint';

interface Props {
  overrides?: MediaOverrides;
  copyOverrides?: CopyOverrides;
}

export default function QuizShell({ overrides, copyOverrides }: Props) {
  const { currentStepIndex, nextStep, addAnswer } = useQuizStore();
  const page = STEPS[currentStepIndex];

  /* Sempre que a etapa muda, joga o scroll de volta pro topo.
     Também aplica a cor de fundo da etapa no body (etapa de vendas = preto). */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const bg = page?.backgroundColor;
    if (bg) document.body.style.backgroundColor = bg;
    else document.body.style.removeProperty('background-color');
  }, [currentStepIndex, page?.backgroundColor]);

  if (!page) return null;

  const handleAnswer = (optionIndex: number) => {
    addAnswer({ stepSlug: page.slug, optionIndex });
    nextStep();
  };

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={page.slug}
          initial={{ opacity: 0, filter: 'blur(18px)', scale: 0.94 }}
          animate={{
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1,
            transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          }}
          exit={{
            opacity: 0,
            filter: 'blur(18px)',
            scale: 1.04,
            transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
          }}
          className="w-full"
          style={{ willChange: 'filter, transform, opacity' }}
        >
          <QuizStep
            page={page}
            stepIndex={currentStepIndex}
            totalSteps={STEPS.length}
            onNext={nextStep}
            onAnswer={handleAnswer}
            overrides={overrides}
            copyOverrides={copyOverrides}
          />
        </motion.div>
      </AnimatePresence>
      {/* Re-monta a cada step para reavaliar visibilidade do CTA */}
      <ScrollHint key={`hint-${page.slug}`} />
    </>
  );
}
