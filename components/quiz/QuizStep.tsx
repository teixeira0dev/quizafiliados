'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { FunnelPage, FunnelElement, QuizOption } from '@/lib/types';
import type { MediaOverrides } from '@/lib/media-overrides';
import type { CopyOverrides } from '@/lib/copy-overrides';
import ProgressBar from './ProgressBar';
import CTAButton from './CTAButton';
import AnswerCard from './AnswerCard';
import MediaPlaceholder from './MediaPlaceholder';
import MediaOverrideView from './MediaOverrideView';
import BeforeAfter from './BeforeAfter';
import NoteBlock from './NoteBlock';
import { PURCHASE_URL } from '@/lib/steps';

interface Props {
  page: FunnelPage;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onAnswer: (optionIndex: number) => void;
  overrides?: MediaOverrides;
  copyOverrides?: CopyOverrides;
}

/* ── helpers ─────────────────────────────────────────── */
function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/* Fallback para textos quebrados no funnel_parsed.json
   (referências RSC não resolvidas tipo "$f"). */
const TEXT_FALLBACKS: Record<string, string> = {
  /* Etapa 11 — lista de checkmarks dentro do container branco */
  '7685db49-dd7d-4d7b-9b8f-cf4670ec5ccc':
    '<p>✅ Vai se tornar uma pessoa <strong>impossível de ser ignorada</strong>. Uma nova postura, uma nova mentalidade.</p>' +
    '<p>✅ Vai desenvolver habilidades para <strong>identificar, atrair e aproveitar oportunidades</strong> antes invisíveis.</p>' +
    '<p>✅ Vai transformar seu <strong>ambiente, relacionamentos e sua rotina</strong> — eliminando tudo o que te puxa pra baixo.</p>' +
    '<p>✅ Vai dominar o seu <strong>tempo, sua energia e sua atenção</strong>. Não haverá espaço para procrastinação.</p>' +
    '<p>✅ Vai planejar e organizar todas as áreas da sua vida com <strong>clareza, foco e ação</strong>.</p>' +
    '<p>✅ Vai ter a confiança que nunca teve antes — <strong>pra dizer não sem culpa</strong> e tomar decisões difíceis com firmeza.</p>',
};

/* Cor verde — apenas CTAs de pagamento/garantia (etapa 13). CTAs
   intermediários ("EU QUERO O APLICATIVO" etc.) continuam vermelhos. */
const BUY_COLOR_RE  = /comprar|purchase|buy|garantir|checkout|pagamento|adquirir|assinar/i;
/* Ação de checkout — só os botões que devem REALMENTE abrir o link do
   gateway. Estritamente "comprar / purchase / buy" para evitar disparar
   InitiateCheckout em CTAs intermediários como "EU QUERO O APLICATIVO". */
const CHECKOUT_RE   = /comprar|purchase|buy/i;

function getOptionText(opt: QuizOption): string {
  if (typeof opt.text === 'string') return opt.text;
  if (opt.text && typeof (opt.text as { content?: string }).content === 'string')
    return (opt.text as { content: string }).content;
  return '';
}

/* ── element renderer ───────────────────────────────── */
function Elem({
  el,
  stepIndex,
  totalSteps,
  onNext,
  onAnswer,
  selected,
  setSelected,
  overrides,
  copyOverrides,
}: {
  el: FunnelElement;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onAnswer: (i: number) => void;
  selected: number | null;
  setSelected: (i: number) => void;
  overrides?: MediaOverrides;
  copyOverrides?: CopyOverrides;
}) {
  const override = overrides?.[el.id];
  const copy = copyOverrides?.[el.id];
  switch (el.type) {
    /* ── progress bar ─────────────────────────────── */
    case 'progressV2':
      return <ProgressBar current={stepIndex} total={totalSteps} />;

    /* ── rich text ────────────────────────────────── */
    case 'textV2': {
      /* Tamanho fixo: PC e celular renderizam idêntico. Wrapping nativo
         (.rt usa word-break/overflow-wrap) cuida de telas estreitas.
         customSize vindo do JSON do funil sobrescreve com px exato
         (exceção do contrato — mantém headlines no tamanho desenhado). */
      const customSize = el.data.textCustomSize;
      const size = customSize ? `${customSize}px` : 'var(--fs-base)';
      const align = el.data.textAlignment ?? 'left';
      /* Line-height: títulos grandes ficam mais apertados; corpo respira. */
      const lh =
        el.data.textLineHeight === 'verySmall' ? 1.2 :
        customSize && customSize >= 22         ? 1.25 :
        customSize && customSize >= 18         ? 1.4 :
                                                 1.55;
      let html = copy?.text ?? el.data.text ?? '';
      /* Conteúdo quebrado no JSON de origem ("$f" = referência RSC não resolvida) */
      if (!copy?.text && (html === '$f' || /^\$[a-z]$/i.test(html))) {
        html = TEXT_FALLBACKS[el.id] ?? '';
      }
      /* Placeholder de data do visualizador (gatilho de escassez "Válidos
         até hoje, DD de mês de YYYY"). Calcula no client com locale pt-BR
         pra refletir a timezone do usuário. */
      if (html.includes('{{TODAY_BR}}')) {
        const today = new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
        html = html.replaceAll('{{TODAY_BR}}', today);
      }
      return (
        <div
          className="rt"
          style={{ fontSize: size, textAlign: align as React.CSSProperties['textAlign'], lineHeight: lh, color: 'inherit' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    /* ── section title ────────────────────────────── */
    case 'title': {
      const raw = copy?.title ?? el.data.title ?? '';
      return (
        <div
          className="rt"
          style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, textAlign: 'center', lineHeight: 1.35 }}
          dangerouslySetInnerHTML={{ __html: raw }}
        />
      );
    }

    /* ── image placeholder ────────────────────────── */
    case 'image': {
      if (override) return <MediaOverrideView override={override} />;
      const img = el.data.image;
      return (
        <MediaPlaceholder
          type="image"
          uuid={img?.uuid}
          width={img?.width}
          height={img?.height}
        />
      );
    }

    /* ── video placeholder ────────────────────────── */
    case 'video': {
      if (override) return <MediaOverrideView override={override} />;
      const vid = el.data.videoId ?? el.data.pandaVideoId ?? '';
      const vtype = el.data.type ?? el.data.videoType ?? '';
      return (
        <MediaPlaceholder
          type="video"
          label={`VÍDEO EM PRODUÇÃO${vtype ? ` (${vtype})` : ''}${vid ? ` — ${vid}` : ''}`}
        />
      );
    }

    /* ── custom HTML/script ───────────────────────── */
    case 'script': {
      if (override) return <MediaOverrideView override={override} />;
      const sc = el.data.script ?? '';
      if (sc.includes('<video') || sc.includes('<source')) {
        const m = sc.match(/src="([^"]+)"/);
        const fname = m ? m[1].split('/').pop() ?? '' : '';
        return <MediaPlaceholder type="video" label={`VÍDEO EM PRODUÇÃO${fname ? ` — ${fname}` : ''}`} />;
      }
      // Strip <style> to avoid CSS pollution, replace <img src> with placeholder
      let cleaned = sc.replace(/<style[\s\S]*?<\/style>/gi, '').trim();
      cleaned = cleaned.replace(
        /<img([^>]*)src="[^"]*"([^>]*)>/gi,
        '<div style="background:#161616;border:1.5px dashed #2e2e2e;border-radius:8px;padding:32px;text-align:center;color:#444;font-size:var(--fs-xs)">🖼️ IMAGEM EM PRODUÇÃO</div>'
      );
      if (!cleaned) return <MediaPlaceholder type="image" />;
      return (
        <div
          style={{ width: '100%', overflow: 'hidden', borderRadius: 'var(--radius)' }}
          dangerouslySetInnerHTML={{ __html: cleaned }}
        />
      );
    }

    /* ── carousel ─────────────────────────────────── */
    case 'carousel':
      if (override) return <MediaOverrideView override={override} />;
      return <MediaPlaceholder type="carousel" />;

    /* ── before / after ───────────────────────────── */
    case 'transform':
      /* Override antigo (image/video/embed solto): usa o renderer genérico.
         Override novo (kind=transform com 2 slides) ou sem override: o
         BeforeAfter renderiza o painel rico e injeta as imagens nos slots. */
      if (override && override.kind !== 'transform') {
        return <MediaOverrideView override={override} />;
      }
      return <BeforeAfter el={el} override={override} />;

    /* ── yellow note box ──────────────────────────── */
    case 'note': {
      const colors = el.data.colors ?? {};
      const bg  = (colors as Record<string, string>).background ?? '#ffdd00';
      const fg  = (colors as Record<string, string>).text ?? '#131313';
      const rawTitle = copy?.title ?? el.data.title ?? '';
      const bodyHtml = copy?.text ?? el.data.text ?? '';
      return (
        <NoteBlock
          title={rawTitle ? stripHtml(rawTitle) : undefined}
          html={bodyHtml}
          bgColor={bg}
          textColor={fg}
        />
      );
    }

    /* ── CTA button ───────────────────────────────── */
    case 'button': {
      const rawLabel = copy?.title ?? el.data.title ?? '';
      /* Strip only block-level tags; preserve inline elements (img, etc.)
         so logo icons embedded in button labels render correctly. */
      const labelText = stripHtml(rawLabel);
      const label = rawLabel.replace(/<\/?(p|div)(\s[^>]*)?>(\s*)/gi, ' ').replace(/\s+/g, ' ').trim() || labelText;
      const isFixed    = !!el.data.fixed;
      const isBuyColor = BUY_COLOR_RE.test(labelText);
      const isCheckout = CHECKOUT_RE.test(labelText);
      const btnColor   = isBuyColor ? 'var(--green)' : 'var(--red)';

      const handleClick = () => {
        if (isCheckout) {
          if (typeof window !== 'undefined') {
            const w = window as typeof window & { fbq?: Function; gtag?: Function };
            w.fbq?.('track', 'InitiateCheckout');
            w.gtag?.('event', 'begin_checkout');
          }
          window.open(PURCHASE_URL, '_blank');
        } else {
          onNext();
        }
      };

      return (
        <CTAButton
          label={label}
          color={btnColor}
          variant={isFixed ? 'fixed' : 'pulse'}
          data-testid={isCheckout ? 'cta-purchase' : 'cta-next'}
          onClick={handleClick}
        />
      );
    }

    /* ── quiz options ─────────────────────────────── */
    case 'quizV2': {
      const opts: QuizOption[] = ((el.data.content ?? el.data.options ?? []) as QuizOption[]);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opts.map((opt, idx) => {
            const overrideText = copy?.options?.[idx];
            const html = overrideText && overrideText !== '' ? overrideText : getOptionText(opt);
            return (
              <AnswerCard
                key={opt.id ?? idx}
                html={html}
                selected={selected === idx}
                onClick={() => {
                  setSelected(idx);
                  setTimeout(() => onAnswer(idx), 300);
                }}
              />
            );
          })}
        </div>
      );
    }

    /* ── white container box (variant="red-border" → borda vermelha sem fundo) */
    case 'containerV2': {
      const children = (el.data.children ?? el.data.elements ?? []) as FunnelElement[];
      const isRedBorder = el.data.variant === 'red-border';
      return (
        <div
          style={isRedBorder ? {
            border: '1.5px solid #ff3333',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          } : {
            backgroundColor: 'var(--container-bg)',
            color: 'var(--container-fg)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {children.map((child) => (
            <Elem
              key={child.id}
              el={child}
              stepIndex={stepIndex}
              totalSteps={totalSteps}
              onNext={onNext}
              onAnswer={onAnswer}
              selected={selected}
              setSelected={setSelected}
              overrides={overrides}
              copyOverrides={copyOverrides}
            />
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}

/* ── page component ─────────────────────────────────── */
export default function QuizStep({ page, stepIndex, totalSteps, onNext, onAnswer, overrides, copyOverrides }: Props) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  /* Hero (etapa 1) — diagramação mais tight + topo respira */
  const isHero = stepIndex === 0;
  const gap = isHero ? 16 : 20;

  return (
    <div
      data-hero={isHero ? '' : undefined}
      role="region"
      aria-live="polite"
      aria-label={`Etapa ${stepIndex + 1} de ${totalSteps}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        width: '100%',
        paddingTop: isHero ? 8 : 0,
      }}
    >
      {isHero && (
        <div
          className="quiz-elem-in"
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}
        >
          <Image
            src="/lgtop.png"
            alt="Modo Caverna"
            width={64}
            height={64}
            priority
            fetchPriority="high"
            style={{ width: 64, height: 'auto' }}
          />
        </div>
      )}
      {page.content.map((el, idx) => (
        <div
          key={el.id}
          className="quiz-elem-in"
          style={{ animationDelay: `${Math.min((idx + (isHero ? 1 : 0)) * 60, 360)}ms` }}
        >
          <Elem
            el={el}
            stepIndex={stepIndex}
            totalSteps={totalSteps}
            onNext={onNext}
            onAnswer={onAnswer}
            selected={selectedOption}
            setSelected={setSelectedOption}
            overrides={overrides}
            copyOverrides={copyOverrides}
          />
        </div>
      ))}
    </div>
  );
}
