import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

interface CacheEntry {
  data: string;
  createdAt: number;
  ttlDays: number;
}

const textCacheDir = () => path.join(config.cachePath, 'text');
const imageCacheDir = () => path.join(config.cachePath, 'images');

async function ensureCacheDir(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory exists
  }
}

export function getCacheKey(...parts: string[]): string {
  const hash = crypto.createHash('sha256');
  hash.update(parts.join('|||'));
  return hash.digest('hex').substring(0, 32);
}

export async function getTextCache(key: string): Promise<string | null> {
  if (!config.cacheEnabled) return null;

  try {
    const filePath = path.join(textCacheDir(), `${key}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const entry: CacheEntry = JSON.parse(content);

    // Check TTL
    const ageMs = Date.now() - entry.createdAt;
    const ttlMs = entry.ttlDays * 24 * 60 * 60 * 1000;
    if (ageMs > ttlMs) {
      await fs.unlink(filePath).catch(() => {});
      return null;
    }

    console.log(`[Cache] HIT text: ${key}`);
    return entry.data;
  } catch {
    return null;
  }
}

export async function setTextCache(
  key: string,
  value: string,
  ttlDays: number = config.cacheTtlDays
): Promise<void> {
  if (!config.cacheEnabled) return;

  try {
    await ensureCacheDir(textCacheDir());
    const entry: CacheEntry = {
      data: value,
      createdAt: Date.now(),
      ttlDays,
    };
    const filePath = path.join(textCacheDir(), `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(entry));
    console.log(`[Cache] SET text: ${key}`);
  } catch (error) {
    console.warn(`[Cache] Failed to set text cache: ${error}`);
  }
}

export async function getImageCache(key: string): Promise<Buffer | null> {
  if (!config.cacheEnabled) return null;

  try {
    const metaPath = path.join(imageCacheDir(), `${key}.meta.json`);
    const imagePath = path.join(imageCacheDir(), `${key}.png`);

    const metaContent = await fs.readFile(metaPath, 'utf-8');
    const entry: CacheEntry = JSON.parse(metaContent);

    // Check TTL
    const ageMs = Date.now() - entry.createdAt;
    const ttlMs = entry.ttlDays * 24 * 60 * 60 * 1000;
    if (ageMs > ttlMs) {
      await fs.unlink(metaPath).catch(() => {});
      await fs.unlink(imagePath).catch(() => {});
      return null;
    }

    const imageBuffer = await fs.readFile(imagePath);
    console.log(`[Cache] HIT image: ${key}`);
    return imageBuffer;
  } catch {
    return null;
  }
}

export async function setImageCache(
  key: string,
  buffer: Buffer,
  ttlDays: number = config.cacheTtlDays
): Promise<void> {
  if (!config.cacheEnabled) return;

  try {
    await ensureCacheDir(imageCacheDir());

    const entry: CacheEntry = {
      data: '',
      createdAt: Date.now(),
      ttlDays,
    };
    const metaPath = path.join(imageCacheDir(), `${key}.meta.json`);
    const imagePath = path.join(imageCacheDir(), `${key}.png`);

    await fs.writeFile(metaPath, JSON.stringify(entry));
    await fs.writeFile(imagePath, buffer);
    console.log(`[Cache] SET image: ${key}`);
  } catch (error) {
    console.warn(`[Cache] Failed to set image cache: ${error}`);
  }
}

export async function clearCache(): Promise<void> {
  try {
    await fs.rm(config.cachePath, { recursive: true, force: true });
    console.log('[Cache] Cleared');
  } catch {
    // Directory doesn't exist
  }
}
