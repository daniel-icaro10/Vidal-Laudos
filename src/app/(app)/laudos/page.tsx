/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CalendarPlus, CheckCircle2, ChevronRight, FilePen, Files, ImageOff, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { criarLaudo } from "@/app/actions/laudos";
import { fileUrl } from "@/lib/storage";
import { nomeLaudo } from "@/lib/laudos";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";

type Search = { q?: string; status?: string; autor?: string };

export default async function LaudosPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const gerente = user.role === "GERENTE";
  const { q = "", status = "", autor = "" } = await searchParams;

  const base: Prisma.LaudoWhereInput = gerente ? (autor ? { authorId: autor } : {}) : { authorId: user.id };
  const where: Prisma.LaudoWhereInput = {
    ...base,
    ...(status ? { status } : {}),
    ...(q
      ? { OR: [{ artista: { contains: q } }, { titulo: { contains: q } }, { exposicao: { contains: q } }, { colecao: { contains: q } }] }
      : {}),
  };

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [laudos, total, rascunhos, finalizados, noMes, funcionarios] = await Promise.all([
    prisma.laudo.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { author: { select: { name: true } }, _count: { select: { fotos: true } } },
      take: 200,
    }),
    prisma.laudo.count({ where: base }),
    prisma.laudo.count({ where: { ...base, status: "RASCUNHO" } }),
    prisma.laudo.count({ where: { ...base, status: "FINALIZADO" } }),
    prisma.laudo.count({ where: { ...base, createdAt: { gte: inicioMes } } }),
    gerente ? prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);

  const stats = [
    { label: "Total de laudos", n: total, icon: Files },
    { label: "Em rascunho", n: rascunhos, icon: FilePen, badge: total ? `${Math.round((rascunhos / total) * 100)}%` : null, tom: "amber" },
    { label: "Finalizados", n: finalizados, icon: CheckCircle2, badge: total ? `${Math.round((finalizados / total) * 100)}%` : null, tom: "green" },
    { label: "Criados este mês", n: noMes, icon: CalendarPlus, badge: noMes ? `+${noMes}` : null, tom: "green" },
  ];
  const filtrando = !!(q || status || autor);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={gerente ? "Painel da gerência" : "Painel"}
        title={gerente ? "Todos os laudos" : "Meus laudos"}
        description={`Olá, ${user.name.split(" ")[0]}. Acompanhe os laudos de conservação de obras de arte.`}
      >
        <form action={criarLaudo}>
          <button className="btn-dark">
            <Plus className="h-4 w-4" /> Novo laudo
          </button>
        </form>
      </PageHeader>

      <div className="card grid grid-cols-2 overflow-hidden lg:flex">
        {stats.map(({ label, n, icon: Icon, badge, tom }, i) => (
          <div
            key={label}
            className={`relative flex min-w-0 flex-1 items-center gap-3 p-4 sm:p-5 ${i < 2 ? "border-b border-[#ededeb] lg:border-b-0" : ""} ${
              i < stats.length - 1 ? "lg:after:absolute lg:after:top-6 lg:after:right-0 lg:after:h-12 lg:after:w-px lg:after:bg-stroke" : ""
            } ${i % 2 === 0 ? "border-r border-[#ededeb] lg:border-r-0" : ""}`}
          >
            <div className="icon-chip">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-[18px] text-muted">{label}</p>
              <div className="mt-1 flex items-center justify-between gap-1.5">
                <span className="text-[22px] leading-[30px] font-medium tracking-[-0.44px] text-graphite tabular-nums">{n}</span>
                {badge && (
                  <span className={`rounded-[3px] px-1 text-xs leading-4 ${tom === "amber" ? "bg-[#faf1dc] text-[#9a640b]" : "bg-[#e4f7c6] text-[#4e7200]"}`}>{badge}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <form className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative min-w-0 flex-1 basis-60">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={q} placeholder="Buscar artista, título, exposição ou coleção…" className="input pl-9" />
          </div>
          <select name="status" defaultValue={status} className="input w-auto">
            <option value="">Todos os status</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="FINALIZADO">Finalizado</option>
          </select>
          {gerente && (
            <select name="autor" defaultValue={autor} className="input w-auto">
              <option value="">Todos os funcionários</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          <button className="btn-secondary">Filtrar</button>
          {filtrando && <Link href="/laudos" className="btn-ghost">Limpar</Link>}
        </form>

        {laudos.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="icon-chip h-11 w-11">
              <Files className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="mt-4 text-[15.5px] font-medium text-ink">{filtrando ? "Nenhum laudo encontrado" : "Nenhum laudo ainda"}</div>
            <p className="mt-1 max-w-sm text-[13px] text-muted">
              {filtrando ? "Ajuste a busca ou os filtros." : "Crie o primeiro laudo para começar o registro de uma obra."}
            </p>
            {!filtrando && (
              <form action={criarLaudo} className="mt-5">
                <button className="btn-dark"><Plus className="h-4 w-4" /> Novo laudo</button>
              </form>
            )}
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[1fr_180px_110px_120px_24px] gap-4 px-5 pb-2 text-[13px] text-muted md:grid">
              <span>Obra</span>
              <span>{gerente ? "Responsável" : "Fotos"}</span>
              <span>Atualizado</span>
              <span>Status</span>
              <span />
            </div>
            <ul className="px-2 pb-2">
              {laudos.map((l) => {
                const thumb = fileUrl(l.fotoPrincipal);
                return (
                  <li key={l.id}>
                    <Link
                      href={`/laudos/${l.id}`}
                      className="group grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f6f5f3] md:grid-cols-[1fr_180px_110px_120px_24px]"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-subtle">
                          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-4 w-4 text-muted" />}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-medium tracking-[-0.14px] text-ink">{nomeLaudo(l)}</div>
                          <div className="truncate text-[12.5px] text-muted">{[l.exposicao, l.colecao].filter(Boolean).join(" · ") || "Sem exposição"}</div>
                        </div>
                      </div>
                      <div className="hidden truncate text-[13px] text-soft md:block">
                        {gerente ? l.author.name : <span className="font-mono tabular-nums">{l._count.fotos} fotos</span>}
                      </div>
                      <div className="hidden text-[13px] text-soft tabular-nums md:block">{l.updatedAt.toLocaleDateString("pt-BR")}</div>
                      <div><StatusBadge status={l.status} /></div>
                      <ChevronRight className="hidden h-4 w-4 text-[#c4c4c4] transition group-hover:translate-x-0.5 group-hover:text-ink md:block" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
