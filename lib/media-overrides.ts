import { promises as fs } from 'node:fs';
import path from 'node:path';

export type MediaOverrideKind = 'image' | 'video' | 'carousel' | 'transform';
export type MediaOverrideMode = 'embed' | 'upload' | 'slides';

export interface CarouselSlide {
  kind: 'image' | 'video';
  mode: 'embed' | 'upload';
  embed?: string;
  src?: string;
  mime?: string;
}

export interface MediaOverride {
  kind: MediaOverrideKind;
  mode: MediaOverrideMode;
  embed?: string;
  src?: string;
  mime?: string;
  slides?: CarouselSlide[];
  width?: number;
  updatedAt: string;
}

export type MediaOverrides = Record<string, MediaOverride>;

const OVERRIDES_FILE = path.join(process.cwd(), 'data', 'media-overrides.json');

/* /api/uploads/X era servido por uma rota Node; agora servimos /uploads/X
   direto do estático (CDN) — converte os caminhos legados na leitura. */
function rewriteUploadPath<T extends { src?: string }>(item: T): T {
  if (item.src?.startsWith('/api/uploads/')) {
    item.src = item.src.replace(/^\/api\/uploads\//, '/uploads/');
  }
  return item;
}

export async function readOverrides(): Promise<MediaOverrides> {
  try {
    const raw = await fs.readFile(OVERRIDES_FILE, 'utf8');
    const parsed = JSON.parse(raw) as MediaOverrides;
    if (!parsed || typeof parsed !== 'object') return {};
    for (const k of Object.keys(parsed)) {
      const ov = parsed[k];
      rewriteUploadPath(ov);
      if (ov.slides) ov.slides = ov.slides.map(rewriteUploadPath);
    }
    return parsed;
  } catch {
    return {};
  }
}
