import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { resolveUpload } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  // Pastas de laudo: funcionário só acessa os próprios. "assinaturas" é liberado a usuários logados.
  const [pasta] = parts;
  if (pasta !== "assinaturas" && user.role !== "GERENTE") {
    const laudo = await prisma.laudo.findUnique({ where: { id: pasta }, select: { authorId: true } });
    if (!laudo || laudo.authorId !== user.id) return new Response("Não encontrado", { status: 404 });
  }

  try {
    const data = await fs.readFile(resolveUpload(parts.join("/")));
    const type = parts.at(-1)!.endsWith(".png") ? "image/png" : "image/jpeg";
    return new Response(data, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=31536000, immutable" } });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
