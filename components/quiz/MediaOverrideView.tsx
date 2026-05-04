'use client';

import { useEffect, useRef, useState } from 'react';
import type { MediaOverride, CarouselSlide } from '@/lib/media-overrides';

interface Props {
  override: MediaOverride;
}

const RADIUS = 'var(--radius-lg)';

/* Re-cria os <script> de um container, porque scripts inseridos via
   innerHTML / dangerouslySetInnerHTML nunca executam. */
function executeScripts(root: HTMLElement) {
  const scripts = Array.from(root.querySelectorAll('script'));
  for (const old of scripts) {
    const fresh = document.createElement('script');
    for (const attr of Array.from(old.attributes)) {
      fresh.setAttribute(attr.name, attr.value);
    }
    fresh.text = old.text;
    old.parentNode?.replaceChild(fresh, old);
  }
}

/**
 * Remove regras globais de <style> dos embeds (body / html / *) que vazariam
 * para o resto da página. Mantém regras de classe/id específicas.
 *
 * Também remove @import (geralmente usado pra carregar fontes externas que
 * já temos cobertas pelo Poppins do quiz, e atrasam o render).
 */
const GLOBAL_HEAD_RE = /^(?:(?:html|body)\b|\*)/i;
function sanitizeEmbed(html: string): string {
  return html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_full, raw: string) => {
    let css = raw.replace(/@import\s+[^;]+;/gi, '');
    /* Para cada bloco "seletores { decls }" remove se algum seletor for global */
    css = css.replace(/([^{}@]+)\{([^}]*)\}/g, (rule, selectors: string, decls: string) => {
      const parts = selectors.split(',').map((s) => s.trim()).filter(Boolean);
      const safe = parts.filter((s) => !GLOBAL_HEAD_RE.test(s));
      if (safe.length === 0) return '';
      return `${safe.join(', ')}{${decls}}`;
    });
    return `<style>${css}</style>`;
  });
}

/**
 * Embed HTML com lazy-load:
 *  - Não injeta o HTML até o slot entrar próximo da viewport (rootMargin 300px).
 *  - Mostra um skeleton com aspect-ratio 16:9 enquanto não carrega — assim
 *    o layout não pula quando o player aparece.
 *  - Se o html mudar, re-injeta (mas só se já foi carregado uma vez).
 */
/* Removemos o whenIdle para não atrasar o carregamento da VSL principal */
function runNow(fn: () => void) {
  if (typeof window === 'undefined') return fn();
  requestAnimationFrame(fn);
}

function EmbedHTML({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;

    const safeHtml = sanitizeEmbed(html);

    /* Se já carregou e o html mudar, re-injeta */
    if (loaded) {
      runNow(() => {
        if (cancelled) return;
        el.innerHTML = safeHtml;
        executeScripts(el);
      });
      return () => {
        cancelled = true;
      };
    }

    const inject = () => {
      runNow(() => {
        if (cancelled) return;
        el.innerHTML = safeHtml;
        executeScripts(el);
        setLoaded(true);
      });
    };

    if (typeof IntersectionObserver === 'undefined') {
      inject();
      return () => {
        cancelled = true;
      };
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          inject();
          obs.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    obs.observe(el);
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [html, loaded]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: loaded ? undefined : '16 / 9',
        borderRadius: RADIUS,
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      {/* Embed: innerHTML é controlado imperativamente — React NÃO toca aqui */}
      <div ref={ref} className="media-embed" style={{ width: '100%' }} />
      {/* Skeleton: filho de outro nó pra evitar conflito com o innerHTML acima */}
      {!loaded && <EmbedSkeleton />}
    </div>
  );
}

function EmbedSkeleton() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(110deg, #0a0a0a 30%, #1a1a1a 50%, #0a0a0a 70%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s linear infinite',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.18)',
          borderTopColor: 'rgba(255,255,255,0.7)',
          animation: 'spin 0.9s linear infinite',
        }}
      />
    </div>
  );
}

function SlideContent({ slide }: { slide: CarouselSlide }) {
  if (slide.mode === 'upload' && slide.src) {
    const staticSrc = slide.src.replace(/^\/api\/uploads\//, '/uploads/');
    if (slide.kind === 'image') {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={staticSrc}
          alt=""
          fetchPriority="high"
          decoding="async"
          style={{ width: '100%', height: 'auto', display: 'block' }}
          draggable={false}
        />
      );
    }
    return (
      <video
        src={staticSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        style={{ width: '100%', height: 'auto', display: 'block', backgroundColor: '#000', pointerEvents: 'none' }}
      />
    );
  }
  if (slide.mode === 'embed' && slide.embed) return <EmbedHTML html={slide.embed} />;
  return null;
}

function Carousel({ slides }: { slides: CarouselSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const total = slides.length;

  function goTo(idx: number) {
    const t = trackRef.current;
    if (!t) return;
    const clamped = Math.max(0, Math.min(total - 1, idx));
    t.scrollTo({ left: t.clientWidth * clamped, behavior: 'smooth' });
  }

  function onScroll() {
    const t = trackRef.current;
    if (!t) return;
    setActive(Math.min(total - 1, Math.round(t.scrollLeft / Math.max(t.clientWidth, 1))));
  }

  const canPrev = active > 0;
  const canNext = active < total - 1;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: RADIUS,
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="carousel-track"
        style={{
          display: 'flex',
          gap: 10,
          width: '100%',
          alignItems: 'stretch',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {slides.map((s, i) => (
          <div
            key={i}
            style={{
              flex: '0 0 calc(50% - 5px)',
              width: 'calc(50% - 5px)',
              scrollSnapAlign: 'start',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlideContent slide={s} />
          </div>
        ))}
      </div>

      {/* Setas */}
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => goTo(active - 1)}
        disabled={!canPrev}
        style={arrowStyle('left', canPrev)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Próximo"
        onClick={() => goTo(active + 1)}
        disabled={!canNext}
        style={arrowStyle('right', canNext)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M9 6l6 6-6 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dots */}
      {total > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            pointerEvents: 'none',
          }}
        >
          {slides.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === active ? 18 : 6,
                height: 6,
                borderRadius: 999,
                backgroundColor: i === active ? '#fff' : 'rgba(255,255,255,0.5)',
                transition: 'width var(--t-base), background-color var(--t-base)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function arrowStyle(side: 'left' | 'right', enabled: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    [side]: 8,
    transform: 'translateY(-50%)',
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: enabled ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.25)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    cursor: enabled ? 'pointer' : 'default',
    opacity: enabled ? 1 : 0.4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    zIndex: 2,
    transition: 'opacity var(--t-fast)',
  };
}

/* Imagem com borda vermelha + scale leve dirigido pelo scroll.
   Conforme o centro da imagem se aproxima do centro da viewport,
   aplicamos um scale entre 1 e 1.05. Volta ao normal ao sair. */
function ScrollScaleImage({ src }: { src: string }) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let lastScale = 1;

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) {
        if (lastScale !== 1) {
          el.style.transform = 'scale(1)';
          lastScale = 1;
        }
        return;
      }
      const center = rect.top + rect.height / 2;
      const distFromCenter = Math.abs(center - vh / 2);
      const maxDist = vh / 2 + rect.height / 2;
      const t = Math.max(0, Math.min(1, 1 - distFromCenter / maxDist));
      const scale = 1 + 0.05 * t;
      if (Math.abs(scale - lastScale) > 0.001) {
        el.style.transform = `scale(${scale.toFixed(4)})`;
        lastScale = scale;
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      fetchPriority="high"
      decoding="async"
      style={{
        width: '100%',
        height: 'auto',
        borderRadius: RADIUS,
        display: 'block',
        border: '2px solid #ff3333',
        transformOrigin: 'center',
        transition: 'transform 0.18s ease-out',
        willChange: 'transform',
      }}
    />
  );
}

function renderInner(override: MediaOverride): React.ReactNode {
  /* Carrossel — múltiplos slides */
  if (override.kind === 'carousel' && override.slides && override.slides.length > 0) {
    return <Carousel slides={override.slides} />;
  }

  /* Mídia única */
  if (override.mode === 'upload' && override.src) {
    const staticSrc = override.src.replace(/^\/api\/uploads\//, '/uploads/');
    if (override.kind === 'image') {
      if (staticSrc === '/Gost.webp' || staticSrc === '/Gost.png') {
        return <ScrollScaleImage src={staticSrc} />;
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={staticSrc}
          alt=""
          fetchPriority="high"
          decoding="async"
          style={{ width: '100%', height: 'auto', borderRadius: RADIUS, display: 'block' }}
        />
      );
    }
    return (
      <video
        src={staticSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: RADIUS,
          display: 'block',
          backgroundColor: '#000',
          pointerEvents: 'none',
        }}
      />
    );
  }

  if (override.mode === 'embed' && override.embed) {
    return <EmbedHTML html={override.embed} />;
  }

  return null;
}

export default function MediaOverrideView({ override }: Props) {
  const inner = renderInner(override);
  if (inner === null) return null;

  /* Aplica largura relativa configurada no admin (default 100%).
     Para w > 100 usamos margem negativa pra estourar o container e o
     elemento ficar maior do que a coluna do quiz (banners, etc.). */
  const w = override.width;
  if (!w || w === 100) return <>{inner}</>;
  if (w < 100) {
    return (
      <div style={{ width: `${w}%`, marginLeft: 'auto', marginRight: 'auto' }}>
        {inner}
      </div>
    );
  }
  const overflow = (w - 100) / 2;
  return (
    <div
      style={{
        width: `${w}%`,
        marginLeft: `-${overflow}%`,
        marginRight: `-${overflow}%`,
      }}
    >
      {inner}
    </div>
  );
}
