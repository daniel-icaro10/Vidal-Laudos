import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { CurrentUser } from "./auth";

export const PERIODOS = [
  { value: "3m", label: "3 meses", meses: 3 },
  { value: "6m", label: "6 meses", meses: 6 },
  { value: "12m", label: "12 meses", meses: 12 },
  { value: "tudo", label: "Tudo", meses: null },
] as const;
export type Periodo = (typeof PERIODOS)[number]["value"];

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const inicioDoMes = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const chaveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const DIA = 24 * 60 * 60 * 1000;

export async function getDashboard(user: CurrentUser, periodo: Periodo) {
  const gerente = user.role === "GERENTE";
  const base: Prisma.LaudoWhereInput = gerente ? {} : { authorId: user.id };
  const agora = new Date();
  const cfg = PERIODOS.find((p) => p.value === periodo) ?? PERIODOS[1];
  const inicio = cfg.meses ? inicioDoMes(new Date(agora.getFullYear(), agora.getMonth() - (cfg.meses - 1), 1)) : null;
  const noPeriodo: Prisma.LaudoWhereInput = { ...base, ...(inicio ? { createdAt: { gte: inicio } } : {}) };

  const mesAtual = chaveMes(agora);
  const mesAnteriorData = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

  const [laudos, danosAgrupados, doMes, criadosMes, criadosMesAnterior, pendentesBrutos, recentes] = await Promise.all([
    prisma.laudo.findMany({
      where: noPeriodo,
      select: {
        id: true, status: true, estado: true, createdAt: true, updatedAt: true, authorId: true,
        author: { select: { name: true } },
        _count: { select: { fotos: true } },
      },
    }),
    prisma.laudoDano.groupBy({
      by: ["termoId"],
      where: { laudo: noPeriodo },
      _count: { termoId: true },
      orderBy: { _count: { termoId: "desc" } },
      take: 6,
    }),
    // Calendário: exames do mês corrente (pela data do exame)
    prisma.laudo.findMany({ where: { ...base, dataExame: { startsWith: mesAtual } }, select: { dataExame: true } }),
    prisma.laudo.count({ where: { ...base, createdAt: { gte: inicioDoMes(agora) } } }),
    prisma.laudo.count({ where: { ...base, createdAt: { gte: mesAnteriorData, lt: inicioDoMes(agora) } } }),
    prisma.laudo.findMany({
      where: { ...base, status: "RASCUNHO" },
      orderBy: { updatedAt: "asc" },
      take: 30,
      select: {
        id: true, artista: true, titulo: true, updatedAt: true, estado: true,
        fotoPrincipal: true, fotoFrente: true, fotoVerso: true,
        author: { select: { name: true } },
        _count: { select: { fotos: true, danos: true } },
      },
    }),
    prisma.laudo.findMany({
      where: base,
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, artista: true, titulo: true, status: true, updatedAt: true, fotoPrincipal: true, author: { select: { name: true } } },
    }),
  ]);

  // ---- Indicadores
  const total = laudos.length;
  const finalizados = laudos.filter((l) => l.status === "FINALIZADO");
  const fotos = laudos.reduce((s, l) => s + l._count.fotos, 0);
  const diasAteFinalizar = finalizados.length
    ? finalizados.reduce((s, l) => s + (l.updatedAt.getTime() - l.createdAt.getTime()) / DIA, 0) / finalizados.length
    : null;
  const variacaoMes = criadosMesAnterior ? Math.round(((criadosMes - criadosMesAnterior) / criadosMesAnterior) * 100) : null;

  // ---- Laudos por mês (criados e finalizados)
  const primeiro = inicio ?? (laudos.length ? inicioDoMes(new Date(Math.min(...laudos.map((l) => l.createdAt.getTime())))) : inicioDoMes(agora));
  const meses: { chave: string; label: string; ano: number; criados: number; finalizados: number; atual: boolean }[] = [];
  for (let d = new Date(primeiro); d <= agora && meses.length < 24; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    meses.push({ chave: chaveMes(d), label: MESES_CURTOS[d.getMonth()], ano: d.getFullYear(), criados: 0, finalizados: 0, atual: chaveMes(d) === mesAtual });
  }
  const porChave = new Map(meses.map((m) => [m.chave, m]));
  for (const l of laudos) {
    const m = porChave.get(chaveMes(l.createdAt));
    if (!m) continue;
    m.criados++;
    if (l.status === "FINALIZADO") m.finalizados++;
  }

  // ---- Estado de conservação
  const estados = {
    GOOD: laudos.filter((l) => l.estado === "GOOD").length,
    FAIR: laudos.filter((l) => l.estado === "FAIR").length,
    SEVERE: laudos.filter((l) => l.estado === "SEVERE").length,
    SEM: laudos.filter((l) => !l.estado).length,
  };

  // ---- Danos mais frequentes
  const termos = await prisma.danoTermo.findMany({ where: { id: { in: danosAgrupados.map((d) => d.termoId) } } });
  const danos = danosAgrupados.map((d) => {
    const t = termos.find((x) => x.id === d.termoId)!;
    return { numero: t.numero, pt: t.pt, en: t.en, n: d._count.termoId, pct: total ? Math.round((d._count.termoId / total) * 100) : 0 };
  });

  // ---- Por funcionário (gerente)
  const autores = new Map<string, { nome: string; finalizados: number; rascunhos: number }>();
  for (const l of laudos) {
    const a = autores.get(l.authorId) ?? { nome: l.author.name, finalizados: 0, rascunhos: 0 };
    if (l.status === "FINALIZADO") a.finalizados++;
    else a.rascunhos++;
    autores.set(l.authorId, a);
  }
  const porFuncionario = [...autores.values()].sort((a, b) => b.finalizados + b.rascunhos - (a.finalizados + a.rascunhos));

  // ---- Calendário do mês
  const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
  const examesPorDia = Array.from({ length: diasNoMes }, () => 0);
  for (const l of doMes) {
    const dia = Number(l.dataExame.slice(8, 10));
    if (dia >= 1 && dia <= diasNoMes) examesPorDia[dia - 1]++;
  }
  const calendario = {
    mes: MESES_LONGOS[agora.getMonth()],
    ano: agora.getFullYear(),
    hoje: agora.getDate(),
    offset: new Date(agora.getFullYear(), agora.getMonth(), 1).getDay(),
    dias: examesPorDia,
    total: doMes.length,
  };

  // ---- Pendências: rascunhos com itens faltando, mais antigos primeiro
  const pendencias = pendentesBrutos
    .map((l) => {
      const faltando = [
        !l.fotoPrincipal && "foto principal",
        !l.estado && "estado",
        !(l.fotoFrente && l.fotoVerso) && "frente/verso",
        l._count.fotos === 0 && "fotos de detalhe",
        l._count.danos === 0 && "danos",
      ].filter(Boolean) as string[];
      return { id: l.id, nome: [l.artista, l.titulo].filter(Boolean).join(" - ") || "Laudo sem título", autor: l.author.name, updatedAt: l.updatedAt, faltando };
    })
    .slice(0, 5);
  const totalRascunhos = await prisma.laudo.count({ where: { ...base, status: "RASCUNHO" } });

  return {
    gerente,
    periodo: cfg,
    stats: {
      total,
      finalizados: finalizados.length,
      rascunhos: total - finalizados.length,
      taxa: total ? Math.round((finalizados.length / total) * 100) : 0,
      fotos,
      fotosPorLaudo: total ? fotos / total : 0,
      diasAteFinalizar,
      criadosMes,
      variacaoMes,
    },
    meses,
    estados,
    danos,
    porFuncionario,
    calendario,
    pendencias,
    totalRascunhos,
    recentes,
  };
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
