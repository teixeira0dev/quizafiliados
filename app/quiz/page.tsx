import QuizShell from '@/components/quiz/QuizShell';
import { readOverrides } from '@/lib/media-overrides';
import { readCopyOverrides } from '@/lib/copy-overrides';

export const metadata = {
  title: 'Modo Caverna Quiz',
  description: '40 dias para transformar sua vida com o Modo Caverna.',
};

export const dynamic = 'force-dynamic';

export default async function QuizPage() {
  const [overrides, copyOverrides] = await Promise.all([
    readOverrides(),
    readCopyOverrides(),
  ]);
  return <QuizShell overrides={overrides} copyOverrides={copyOverrides} />;
}
