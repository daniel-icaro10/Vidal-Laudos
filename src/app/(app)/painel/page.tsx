import Link from "next/link";
import {
  Activity, BarChart3, CalendarDays, Camera, CheckCircle2, ClipboardList, Clock3, FileText, Plus, ShieldCheck, Timer, Users,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboard, PERIODOS, type Periodo } from "@/lib/dashboard";
import { criarLaudo } from "@/app/actions/laudos";
import PageHeader from "@/components/PageHeader";
import {
  CalendarioExames, CardHeader, DanosFrequentes, EstadoConservacao, GraficoMensal, Pendencias, PorFuncionario, Recentes, fmt,
} from "@/components/dashboard/Widgets";

const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const user = await requireUser();
  const { periodo: p } = await searchParams;
  const periodo = (PERIODOS.some((x) => x.value === p) ? p : "6m") as Periodo;
  const d = await getDashboard(user, periodo);
  const hoje = new Date();
  const dataHoje = `${DIAS_SEMANA[hoje.getDay()]}, ${hoje.getDate()} de ${d.calendario.mes}`;

  const stats = [
    {
      label: "Laudos no período", icon: FileText, valor: fmt(d.stats.total),
      badge: d.stats.criadosMes ? { txt: `+${d.stats.criadosMes} no mês`, tom: "green" as const } : null,
    },
    {
      label: "Finalizados", icon: CheckCircle2, valor: fmt(d.stats.finalizados), sufixo: d.stats.total ? `/${d.stats.total}` : undefined,
      badge: d.stats.total ? { txt: `${d.stats.taxa}%`, tom: d.stats.taxa >= 50 ? ("green" as const) : ("amber" as const) } : null,
    },
    {
      label: "Fotos registradas", icon: Camera, valor: fmt(d.stats.fotos),
      badge: d.stats.total ? { txt: `${d.stats.fotosPorLaudo.toFixed(1).replace(".", ",")}/laudo`, tom: "neutral" as const } : null,
    },
    {
      label: "Tempo até finalizar", icon: Timer,
      valor: d.stats.diasAteFinalizar === null ? "—" : d.stats.diasAteFinalizar.toFixed(1).replace(".", ","),
      sufixo: d.stats.diasAteFinalizar === null ? undefined : " dias",
      badge: null,
    },
  ];
  const tons = { green: "bg-[#e4f7c6] text-[#4e7200]", amber: "bg-[#faf1dc] text-[#9a640b]", red: "bg-[#f6c6c6] text-[#720000]", neutral: "bg-subtle text-soft" };

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)} title={d.gerente ? "Painel da gerência" : `Olá, ${user.name.split(" ")[0]}`}>
        <form action={criarLaudo}>
          <button className="btn-dark">
            <Plus className="h-4 w-4" /> Novo laudo
          </button>
        </form>
      </PageHeader>

      {/* Filtro de período: uma linha acima de tudo, vale para todo o painel */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">Período</span>
        <div className="flex gap-1 rounded-full bg-subtle p-1">
          {PERIODOS.map((x) => (
            <Link
              key={x.value}
              href={x.value === "6m" ? "/painel" : `/painel?periodo=${x.value}`}
              scroll={false}
              className={`rounded-full px-3 py-1 text-[12.5px] transition-colors ${
                x.value === periodo ? "bg-graphite text-white" : "text-soft hover:bg-hover"
              }`}
            >
              {x.label}
            </Link>
          ))}
        </div>
        {d.stats.variacaoMes !== null && (
          <span className="ml-auto text-[12.5px] text-muted">
            Este mês: <span className="text-ink tabular-nums">{d.stats.criadosMes}</span> laudo(s),{" "}
            <span className={`rounded-[3px] px-1 tabular-nums ${d.stats.variacaoMes >= 0 ? tons.green : tons.red}`}>
              {d.stats.variacaoMes >= 0 ? "+" : ""}{d.stats.variacaoMes}%
            </span>{" "}
            vs. mês anterior
          </span>
        )}
      </div>

      {/* Faixa de indicadores */}
      <div className="card grid grid-cols-2 overflow-hidden lg:flex">
        {stats.map(({ label, icon: Icon, valor, sufixo, badge }, i) => (
          <div
            key={label}
            className={`relative flex min-w-0 flex-1 items-center gap-3 p-4 sm:p-5 ${i < 2 ? "border-b border-[#ededeb] lg:border-b-0" : ""} ${
              i % 2 === 0 ? "border-r border-[#ededeb] lg:border-r-0" : ""
            } ${i < stats.length - 1 ? "lg:after:absolute lg:after:top-6 lg:after:right-0 lg:after:h-12 lg:after:w-px lg:after:bg-stroke" : ""}`}
          >
            <div className="icon-chip">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-[18px] text-muted">{label}</p>
              <div className="mt-1 flex items-center justify-between gap-1.5">
                <span className="truncate text-[22px] leading-[30px] font-medium tracking-[-0.44px] text-graphite tabular-nums">
                  {valor}
                  {sufixo && <small className="text-[15px] font-normal text-muted">{sufixo}</small>}
                </span>
                {badge && <span className={`shrink-0 rounded-[3px] px-1 text-xs leading-4 whitespace-nowrap ${tons[badge.tom]}`}>{badge.txt}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
        <section className="card flex min-w-0 flex-col lg:col-span-8 2xl:col-span-6">
          <CardHeader
            icon={BarChart3}
            title="Laudos por mês"
            subtitle={`Criados no período · ${d.periodo.label.toLowerCase()}`}
            action={<span className="flex items-center gap-1.5 text-[12px] text-muted"><span className="h-2.5 w-2.5 rounded-[3px] bg-brand-500" /> mês atual</span>}
          />
          <GraficoMensal meses={d.meses} />
        </section>

        <section className="card flex min-w-0 flex-col lg:col-span-4 2xl:col-span-3">
          <CardHeader icon={ShieldCheck} title="Estado de conservação" subtitle="Avaliação geral das obras no período" />
          <EstadoConservacao estados={d.estados} />
        </section>

        <section className="card flex min-w-0 flex-col bg-graphite! text-white lg:col-span-4 2xl:col-span-3">
          <CardHeader icon={CalendarDays} title={`Exames em ${d.calendario.mes}`} subtitle={`${d.calendario.total} laudo(s) pela data do exame`} dark />
          <CalendarioExames calendario={d.calendario} />
        </section>

        <section className={`card flex min-w-0 flex-col lg:col-span-4 ${d.gerente ? "" : "2xl:col-span-6"}`}>
          <CardHeader icon={Activity} title="Danos mais frequentes" subtitle="Ocorrências no glossário do laudo" count={d.danos.length || undefined} />
          <DanosFrequentes danos={d.danos} />
        </section>

        <section className={`card flex min-w-0 flex-col lg:col-span-4 ${d.gerente ? "" : "2xl:col-span-6"}`}>
          <CardHeader
            icon={ClipboardList}
            title="Pendências"
            subtitle="Rascunhos parados há mais tempo"
            count={d.totalRascunhos}
            action={d.totalRascunhos > 0 ? <Link href="/laudos?status=RASCUNHO" className="text-[12px] text-muted hover:text-ink">Ver todos</Link> : undefined}
          />
          <Pendencias itens={d.pendencias} gerente={d.gerente} />
        </section>

        {d.gerente && (
          <section className="card flex min-w-0 flex-col lg:col-span-4">
            <CardHeader icon={Users} title="Produção por funcionário" subtitle="Finalizados / total no período" count={d.porFuncionario.length} />
            <PorFuncionario dados={d.porFuncionario} />
          </section>
        )}

        <section className={`card flex min-w-0 flex-col ${d.gerente ? "lg:col-span-8 2xl:col-span-12" : "lg:col-span-12"}`}>
          <CardHeader
            icon={Clock3}
            title="Atividade recente"
            subtitle="Últimos laudos editados"
            action={<Link href="/laudos" className="text-[12px] text-muted hover:text-ink">Ver todos</Link>}
          />
          <Recentes itens={d.recentes} gerente={d.gerente} />
        </section>
      </div>
    </div>
  );
}
