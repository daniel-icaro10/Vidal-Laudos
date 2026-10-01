import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { podeEditar } from "@/lib/laudos";
import { deleteUpload, fileUrl, saveImage } from "@/lib/storage";

const SLOTS = ["fotoPrincipal", "fotoFrente", "fotoVerso", "fotoDanos"];
const TIPOS = ["DETALHE", "EMBALAGEM"];

// POST multipart: file + (slot | tipo)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const laudo = await prisma.laudo.findUnique({ where: { id } });
  if (!laudo || (user.role !== "GERENTE" && laudo.authorId !== user.id)) {
    return NextResponse.json({ error: "Laudo não encontrado" }, { status: 404 });
  }
  if (!podeEditar(laudo, user)) return NextResponse.json({ error: "Laudo finalizado" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Envie uma imagem" }, { status: 400 });
  }

  let rel: string;
  try {
    rel = await saveImage(id, file);
  } catch {
    return NextResponse.json({ error: "Não foi possível processar a imagem" }, { status: 400 });
  }

  const slot = String(form.get("slot") ?? "");
  if (SLOTS.includes(slot)) {
    const anterior = (laudo as Record<string, unknown>)[slot] as string | null;
    await prisma.laudo.update({ where: { id }, data: { [slot]: rel } });
    await deleteUpload(anterior);
    return NextResponse.json({ slot, path: rel, url: fileUrl(rel) });
  }

  const tipo = String(form.get("tipo") ?? "");
  if (!TIPOS.includes(tipo)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  const ordem = await prisma.foto.count({ where: { laudoId: id, tipo } });
  const foto = await prisma.foto.create({
    data: { laudoId: id, tipo, path: rel, ordem, legenda: String(form.get("legenda") ?? "") },
  });
  return NextResponse.json({ foto: { ...foto, url: fileUrl(rel) } });
}
