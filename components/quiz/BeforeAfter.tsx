'use client';

import type { FunnelElement } from '@/lib/types';
import type { MediaOverride, CarouselSlide } from '@/lib/media-overrides';
import MediaPlaceholder from './MediaPlaceholder';

interface Props {
  el: FunnelElement;
  override?: MediaOverride;
}

interface SideData {
  title: string;
  subtitle: string;
  description: string;
  level: string;
  imageUuid?: string;
  imageW?: number;
  imageH?: number;
  barColor: string;
  bgColor: string;
  /** Slide do override correspondente, se houver */
  slide?: CarouselSlide;
}

/**
 * Bloco "ANTES / DEPOIS" — panel de comparação.
 *
 * Quando há override do tipo "transform" com 2 slides, as imagens dos slots
 * (slide[0] = ANTES, slide[1] = DEPOIS) substituem os placeholders.
 */
export default function BeforeAfter({ el, override }: Props) {
  const d = el.data as Record<string, unknown> & {
    colors?: Record<string, string>;
    aImage?: { uuid: string; width: number; height: number };
    bImage?: { uuid: string; width: number; height: number };
    aTitle?: string; bTitle?: string;
    aSubtitle?: string; bSubtitle?: string;
    aDescription?: string; bDescription?: string;
    aLevel?: string; bLevel?: string;
  };
  const colors = d.colors ?? {};
  const slides = override?.kind === 'transform' ? override.slides : undefined;

  const sideB: SideData = {
    title: d.bTitle ?? 'ANTES',
    subtitle: d.bSubtitle ?? '',
    description: d.bDescription ?? '',
    level: d.bLevel ?? '15',
    imageUuid: d.bImage?.uuid,
    imageW: d.bImage?.width,
    imageH: d.bImage?.height,
    barColor: colors.bBar ?? '#ff5c5c',
    bgColor: colors.bBackground ?? '#ff5c5c',
    slide: slides?.[0],
  };
  const sideA: SideData = {
    title: d.aTitle ?? 'DEPOIS',
    subtitle: d.aSubtitle ?? '',
    description: d.aDescription ?? '',
    level: d.aLevel ?? '95',
    imageUuid: d.aImage?.uuid,
    imageW: d.aImage?.width,
    imageH: d.aImage?.height,
    barColor: colors.aBar ?? '#4bbe68',
    bgColor: colors.aBackground ?? '#4bbe68',
    slide: slides?.[1],
  };

  const containerBg  = colors.background ?? '#000000';
  const borderColor  = colors.border ?? '#525252';
  const trackBg      = colors.barBackground ?? '#ffffff';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        padding: 12,
        borderRadius: 'var(--radius-lg)',
        backgroundColor: containerBg,
        border: `1px solid ${borderColor}`,
      }}
    >
      <Side data={sideB} trackBg={trackBg} />
      <Side data={sideA} trackBg={trackBg} />
    </div>
  );
}

function SlideMedia({ slide }: { slide: CarouselSlide }) {
  if (slide.mode === 'upload' && slide.src) {
    if (slide.kind === 'image') {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.src}
          alt=""
          style={{
            width: '100%',
            aspectRatio: '4 / 5',
            objectFit: 'cover',
            display: 'block',
            borderRadius: 8,
          }}
        />
      );
    }
    return (
      <video
        src={slide.src}
        controls
        playsInline
        preload="metadata"
        style={{
          width: '100%',
          aspectRatio: '4 / 5',
          objectFit: 'cover',
          display: 'block',
          borderRadius: 8,
          backgroundColor: '#000',
        }}
      />
    );
  }
  if (slide.mode === 'embed' && slide.embed) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '4 / 5',
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
        dangerouslySetInnerHTML={{ __html: slide.embed }}
      />
    );
  }
  return null;
}

function Side({ data, trackBg }: { data: SideData; trackBg: string }) {
  const levelPct = Math.max(0, Math.min(100, parseInt(data.level || '0', 10)));
  const customMedia = data.slide ? <SlideMedia slide={data.slide} /> : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          backgroundColor: data.bgColor,
          color: '#fff',
          fontWeight: 800,
          fontSize: 13,
          textAlign: 'center',
          padding: '6px 8px',
          borderRadius: 6,
          letterSpacing: '0.06em',
        }}
      >
        {data.title}
      </div>

      {customMedia ?? (
        <MediaPlaceholder
          type="image"
          uuid={data.imageUuid}
          width={data.imageW}
          height={data.imageH}
        />
      )}

      <div
        style={{
          height: 6,
          width: '100%',
          backgroundColor: trackBg,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${levelPct}%`,
            height: '100%',
            backgroundColor: data.barColor,
            borderRadius: 999,
          }}
        />
      </div>

      {data.subtitle && (
        <div
          className="rt"
          style={{ fontSize: 12, color: '#bbb', fontWeight: 600 }}
          dangerouslySetInnerHTML={{ __html: data.subtitle }}
        />
      )}

      {data.description && (
        <div
          className="rt"
          style={{ fontSize: 13, color: '#fff', lineHeight: 1.45 }}
          dangerouslySetInnerHTML={{ __html: data.description }}
        />
      )}
    </div>
  );
}
