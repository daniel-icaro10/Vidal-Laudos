import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));

/** Normaliza (orientação EXIF, tamanho máx. 2000px, JPEG) e salva. Retorna o caminho relativo. */
export async function saveImage(folder: string, file: File, opts: { png?: boolean } = {}) {
  const buf = Buffer.from(await file.arrayBuffer());
  const dir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  const img = sharp(buf).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true });
  const name = `${randomUUID()}.${opts.png ? "png" : "jpg"}`;
  const out = opts.png ? await img.png().toBuffer() : await img.jpeg({ quality: 82 }).toBuffer();
  await fs.writeFile(path.join(dir, name), out);
  return `${folder}/${name}`;
}

export function resolveUpload(rel: string) {
  const full = path.normalize(path.join(UPLOAD_DIR, rel));
  if (!full.startsWith(UPLOAD_DIR + path.sep)) throw new Error("Caminho inválido");
  return full;
}

export async function deleteUpload(rel: string | null | undefined) {
  if (!rel) return;
  await fs.rm(resolveUpload(rel), { force: true }).catch(() => {});
}

export async function deleteFolder(folder: string) {
  await fs.rm(resolveUpload(folder), { recursive: true, force: true }).catch(() => {});
}

export const fileUrl = (rel: string | null | undefined) => (rel ? `/api/files/${rel}` : null);
