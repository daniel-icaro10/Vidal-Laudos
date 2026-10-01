// Reduz a foto no navegador antes do envio (economiza dados no celular).
export async function comprimirImagem(file: File, max = 2000, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    return blob ?? file;
  } catch {
    return file; // ex.: HEIC em navegador sem suporte — o servidor tenta converter
  }
}

export async function enviarFoto(laudoId: string, file: File, campos: Record<string, string>) {
  const fd = new FormData();
  fd.append("file", await comprimirImagem(file), file.name.replace(/\.\w+$/, "") + ".jpg");
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  const res = await fetch(`/api/laudos/${laudoId}/fotos`, { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Falha no envio");
  return json;
}
