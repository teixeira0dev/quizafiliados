'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { QuizAnswer } from './types';
import { STEPS } from './steps';

interface QuizState {
  currentStepIndex: number;
  answers: QuizAnswer[];
  nextStep: () => void;
  goToStep: (index: number) => void;
  addAnswer: (answer: QuizAnswer) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      currentStepIndex: 0,
      answers: [],

      nextStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex < STEPS.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
        }
      },

      goToStep: (index: number) => {
        if (index >= 0 && index < STEPS.length) {
          set({ currentStepIndex: index });
        }
      },

      addAnswer: (answer: QuizAnswer) => {
        set((state) => ({
          answers: [
            ...state.answers.filter((a) => a.stepSlug !== answer.stepSlug),
            answer,
          ],
        }));
      },

      reset: () => set({ currentStepIndex: 0, answers: [] }),
    }),
    {
      name: 'mc-quiz',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? sessionStorage : localStorage
      ),
    }
  )
);
