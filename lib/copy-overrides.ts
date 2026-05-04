import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface CopyOverride {
  text?: string;
  title?: string;
  options?: (string | undefined)[];
  updatedAt: string;
}

export type CopyOverrides = Record<string, CopyOverride>;

const COPY_FILE = path.join(process.cwd(), 'data', 'copy-overrides.json');

export async function readCopyOverrides(): Promise<CopyOverrides> {
  try {
    const raw = await fs.readFile(COPY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as CopyOverrides) : {};
  } catch {
    return {};
  }
}
