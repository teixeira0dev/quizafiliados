import type { QuizAnswer, ProfileKey } from './types';

export function calculateProfile(answers: QuizAnswer[]): ProfileKey {
  if (answers.length === 0) return 'PERFIL_A';
  const total = answers.reduce((sum, a) => sum + a.optionIndex, 0);
  const max = answers.length * 2; // max index is 2
  const ratio = total / max;

  if (ratio <= 0.33) return 'PERFIL_A';
  if (ratio <= 0.66) return 'PERFIL_B';
  return 'PERFIL_C';
}

export const PROFILES: Record<ProfileKey, { label: string; description: string }> = {
  PERFIL_A: {
    label: 'Modo Despertar',
    description: 'Você está no começo da jornada — perdido, mas com vontade de mudar. O Modo Caverna foi feito pra você.',
  },
  PERFIL_B: {
    label: 'Modo Transição',
    description: 'Você sabe o que quer, mas ainda se distrai. 40 dias de Caverna vão forjar a disciplina que falta.',
  },
  PERFIL_C: {
    label: 'Modo Evolução',
    description: 'Você já tem clareza — o Modo Caverna vai acelerar sua transformação e eliminar o que te paralisa.',
  },
};
