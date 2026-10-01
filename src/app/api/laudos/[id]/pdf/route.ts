import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { nomeLaudo } from "@/lib/laudos";
import { gerarPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const laudo = await prisma.laudo.findUnique({ where: { id }, select: { authorId: true, artista: true, titulo: true } });
  if (!laudo || (user.role !== "GERENTE" && laudo.authorId !== user.id)) return new Response("Não encontrado", { status: 404 });

  const base = process.env.APP_URL || new URL(req.url).origin;
  try {
    const pdf = await gerarPdf(base, id, { sub: user.id, role: user.role, name: user.name });
    const nome = `Laudo - ${nomeLaudo(laudo)}`.replace(/[\/:*?"<>|]+/g, "").slice(0, 120) + ".pdf";
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="laudo.pdf"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(`Não foi possível gerar o PDF: ${(e as Error).message}`, { status: 500 });
  }
}
