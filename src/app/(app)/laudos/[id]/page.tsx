import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLaudoOr404, podeEditar } from "@/lib/laudos";
import { fileUrl } from "@/lib/storage";
import LaudoEditor from "./LaudoEditor";

export default async function LaudoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const laudo = await getLaudoOr404(id, user);

  const [termos, itens] = await Promise.all([
    prisma.danoTermo.findMany({ where: { OR: [{ ativo: true }, { laudos: { some: { laudoId: id } } }] }, orderBy: { numero: "asc" } }),
    prisma.embalagemItem.findMany({ where: { OR: [{ ativo: true }, { laudos: { some: { laudoId: id } } }] }, orderBy: [{ grupo: "asc" }, { ordem: "asc" }] }),
  ]);

  return (
    <LaudoEditor
      editavel={podeEditar(laudo, user)}
      gerente={user.role === "GERENTE"}
      termos={termos.map(({ id, numero, pt, en }) => ({ id, numero, pt, en }))}
      itens={itens.map(({ id, pt, en, grupo }) => ({ id, pt, en, grupo }))}
      laudo={{
        id: laudo.id,
        status: laudo.status,
        autor: laudo.author.name,
        campos: {
          artista: laudo.artista,
          titulo: laudo.titulo,
          dataObra: laudo.dataObra,
          material: laudo.material,
          dimensoes: laudo.dimensoes,
          colecao: laudo.colecao,
          exposicao: laudo.exposicao,
          estado: laudo.estado as "" | "GOOD" | "FAIR" | "SEVERE",
          comentarios: laudo.comentarios,
          local: laudo.local,
          dataExame: laudo.dataExame,
          examinador: laudo.examinador,
          embalagemOutros: laudo.embalagemOutros,
        },
        slots: {
          fotoPrincipal: fileUrl(laudo.fotoPrincipal),
          fotoFrente: fileUrl(laudo.fotoFrente),
          fotoVerso: fileUrl(laudo.fotoVerso),
          fotoDanos: fileUrl(laudo.fotoDanos),
        },
        fotos: laudo.fotos.map((f) => ({ id: f.id, tipo: f.tipo, legenda: f.legenda, ordem: f.ordem, url: fileUrl(f.path)! })),
        danos: laudo.danos.map((d) => d.termoId),
        embalagens: laudo.embalagens.map((e) => e.itemId),
      }}
    />
  );
}
