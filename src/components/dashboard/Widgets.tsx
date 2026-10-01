/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, CircleDashed, CircleAlert, ImageOff, type LucideIcon } from "lucide-react";
import type { Dashboard } from "@/lib/dashboard";
import { fileUrl } from "@/lib/storage";
import StatusBadge from "@/components/StatusBadge";

// Paleta de status validada (dataviz validate_palette: CVD ΔE ≥ 13, sempre com rótulo + ícone)
export const COR = { bom: "#2c8139", regular: "#d9a032", grave: "#d4432e" };

const fmt = (n: number) => n.toLocaleString("pt-BR");
const relativo = (d: Date) => {
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return d.toLocaleDateString("pt-BR");
};

export function CardHeader({
  icon: Icon, title, subtitle, count, action, dark,
}: {
  icon: LucideIcon; title: string; subtitle?: string; count?: number; action?: React.ReactNode; dark?: boolean;
}) {
  return (
    <header className="flex min-h-[68px] items-center gap-2.5 p-4">
      <div className={`icon-chip ${dark ? "bg-white/10!" : ""}`}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className={`truncate text-[15.5px] leading-5 font-medium tracking-[-0.25px] ${dark ? "text-white" : "text-ink"}`}>{title}</h2>
          {count !== undefined && <span className={`count ${dark ? "bg-white/15 text-white/80" : ""}`}>{count}</span>}
        </div>
        {subtitle && <p className={`mt-0.5 truncate text-[12.5px] leading-4 ${dark ? "text-white/60" : "text-muted"}`}>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-[12px] leading-4 whitespace-nowrap text-white shadow-card hidden group-hover:block group-focus-visible:block"
    >
      {children}
    </span>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <div className="flex h-full min-h-32 items-center justify-center px-6 pb-6 text-center text-[13px] text-muted">{texto}</div>;
}

/* ---------- Laudos por mês: barras de série única, mês atual em destaque ---------- */
export function GraficoMensal({ meses }: { meses: Dashboard["meses"] }) {
  const max = Math.max(1, ...meses.map((m) => m.criados));
  const topo = Math.max(4, Math.ceil(max / 4) * 4);
  const linhas = [topo, topo / 2, 0];
  const totalPeriodo = meses.reduce((s, m) => s + m.criados, 0);
  if (totalPeriodo === 0) return <Vazio texto="Nenhum laudo criado no período." />;

  return (
    <div className="flex flex-1 flex-col px-4 pb-4">
      <div className="relative flex min-h-56 flex-1 gap-3 pl-7">
        {/* grade recessiva */}
        <div className="pointer-events-none absolute inset-0 left-0 flex flex-col justify-between pb-6">
          {linhas.map((v) => (
            <div key={v} className="flex items-center gap-2">
              <span className="w-5 text-right text-[11px] text-muted tabular-nums">{v}</span>
              <span className="h-px flex-1 border-t border-dashed border-[#ececea]" />
            </div>
          ))}
        </div>
        {meses.map((m) => {
          const h = (m.criados / topo) * 100;
          return (
            <div key={m.chave} className="relative z-10 flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full flex-1 items-end justify-center pb-0">
                <div
                  tabIndex={0}
                  aria-label={`${m.label} ${m.ano}: ${m.criados} criados, ${m.finalizados} finalizados`}
                  className="group relative flex h-full w-full max-w-10 cursor-default items-end justify-center outline-none"
                >
                  <Tooltip>
                    <strong className="font-medium">{m.criados}</strong> criados · <strong className="font-medium">{m.finalizados}</strong> finalizados
                    <span className="block text-white/60">{m.label} {m.ano}</span>
                  </Tooltip>
                  <div
                    className={`w-full rounded-t-[10px] rounded-b-[4px] transition-[filter] group-hover:brightness-95 group-focus-visible:ring-2 group-focus-visible:ring-graphite ${
                      m.atual ? "bg-brand-500" : "bg-linear-to-b from-[#f4f4f3] to-[#e7e7e5]"
                    }`}
                    style={{ height: `${Math.max(h, m.criados ? 4 : 1.5)}%` }}
                  />
                </div>
              </div>
              <div className={`mt-2 h-4 text-[11.5px] ${m.atual ? "font-medium text-ink" : "text-muted"}`}>{m.label}</div>
            </div>
          );
        })}
      </div>
      <details className="mt-3 text-[12.5px]">
        <summary className="cursor-pointer text-muted select-none hover:text-ink">Ver tabela</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-muted">
            <tr><th className="py-1 font-normal">Mês</th><th className="py-1 text-right font-normal">Criados</th><th className="py-1 text-right font-normal">Finalizados</th></tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.chave} className="border-t border-[#ededeb]">
                <td className="py-1">{m.label}/{m.ano}</td><td className="py-1 text-right">{m.criados}</td><td className="py-1 text-right">{m.finalizados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/* ---------- Estado de conservação: barra segmentada + linhas rotuladas ---------- */
export function EstadoConservacao({ estados }: { estados: Dashboard["estados"] }) {
  const avaliados = estados.GOOD + estados.FAIR + estados.SEVERE;
  const itens = [
    { k: "GOOD", label: "Bom", en: "Good", n: estados.GOOD, cor: COR.bom, icon: CheckCircle2 },
    { k: "FAIR", label: "Regular", en: "Fair", n: estados.FAIR, cor: COR.regular, icon: CircleAlert },
    { k: "SEVERE", label: "Grave", en: "Severe", n: estados.SEVERE, cor: COR.grave, icon: AlertTriangle },
  ];
  if (avaliados === 0 && estados.SEM === 0) return <Vazio texto="Nenhum laudo no período." />;
  return (
    <div className="flex flex-1 flex-col justify-between gap-5 px-4 pb-5">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-[34px] leading-none font-medium tracking-[-1px] text-graphite tabular-nums">
            {avaliados ? Math.round((estados.GOOD / avaliados) * 100) : 0}%
          </span>
          <span className="text-[13px] text-muted">das obras avaliadas em bom estado</span>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          {avaliados} avaliada(s){estados.SEVERE > 0 ? ` · ${estados.SEVERE} em estado grave exigem atenção` : ""}
        </p>
      </div>
      <div className="flex h-3 gap-[2px]">
        {itens.filter((i) => i.n > 0).map((i) => (
          <div key={i.k} tabIndex={0} className="group relative outline-none first:rounded-l-full last:rounded-r-full" style={{ flexGrow: i.n, backgroundColor: i.cor }}>
            <Tooltip><strong className="font-medium">{i.n}</strong> {i.label.toLowerCase()} · {Math.round((i.n / avaliados) * 100)}%</Tooltip>
          </div>
        ))}
      </div>
      <ul className="space-y-1">
        {itens.map(({ k, label, en, n, cor, icon: Icon }) => {
          const pct = avaliados ? Math.round((n / avaliados) * 100) : 0;
          return (
            <li key={k} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-canvas">
              <Icon className="h-4 w-4 shrink-0" style={{ color: cor }} strokeWidth={2} />
              <span className="flex-1 text-[13px] text-ink">
                {label} <span className="text-muted">/ {en}</span>
              </span>
              <span className="text-[13px] font-medium text-ink tabular-nums">{n}</span>
              <span className="w-10 text-right text-[12px] text-muted tabular-nums">{pct}%</span>
            </li>
          );
        })}
        {estados.SEM > 0 && (
          <li className="flex items-center gap-3 px-2 py-2">
            <CircleDashed className="h-4 w-4 shrink-0 text-muted" />
            <span className="flex-1 text-[13px] text-muted">Sem avaliação</span>
            <span className="text-[13px] text-muted tabular-nums">{estados.SEM}</span>
            <span className="w-10" />
          </li>
        )}
      </ul>
    </div>
  );
}

/* ---------- Danos mais frequentes: barras horizontais, rótulo direto ---------- */
export function DanosFrequentes({ danos }: { danos: Dashboard["danos"] }) {
  if (danos.length === 0) return <Vazio texto="Nenhum dano registrado no período." />;
  const max = Math.max(...danos.map((d) => d.n));
  return (
    <ul className="flex flex-1 flex-col justify-between gap-3 px-4 pb-5">
      {danos.map((d) => (
        <li key={d.numero} tabIndex={0} className="group relative outline-none">
          <Tooltip><strong className="font-medium">{d.n}</strong> laudo(s) · {d.pct}% do período</Tooltip>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
            <span className="truncate text-ink">
              <span className="text-muted tabular-nums">{d.numero}.</span> {d.pt} <span className="text-muted">/ {d.en}</span>
            </span>
            <span className="font-medium text-ink tabular-nums">{d.n}</span>
          </div>
          <div className="h-2 rounded-full bg-subtle">
            <div className="h-full rounded-full bg-graphite transition-[filter] group-hover:brightness-125" style={{ width: `${(d.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Calendário de exames do mês (cartão escuro, como na referência) ---------- */
export function CalendarioExames({ calendario }: { calendario: Dashboard["calendario"] }) {
  const max = Math.max(1, ...calendario.dias);
  const celulas: (number | null)[] = [...Array(calendario.offset).fill(null), ...calendario.dias.map((_, i) => i + 1)];
  return (
    <div className="flex flex-1 flex-col justify-between px-4 pb-5">
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="pb-1 text-[11.5px] text-white/60">{d}</span>
        ))}
        {celulas.map((dia, i) => {
          if (dia === null) return <span key={i} />;
          const n = calendario.dias[dia - 1];
          const hoje = dia === calendario.hoje;
          const futuro = dia > calendario.hoje;
          const pico = n > 0 && n === max;
          return (
            <span
              key={i}
              tabIndex={0}
              aria-label={`${dia} de ${calendario.mes}: ${n} exame(s)`}
              className={`group relative mx-auto grid aspect-square w-full max-w-9 place-items-center rounded-full text-[12px] outline-none tabular-nums focus-visible:ring-2 focus-visible:ring-white ${
                pico ? "bg-brand-500 font-medium text-brand-900" : n > 0 ? "bg-white/25 text-white" : futuro ? "text-white/25 ring-1 ring-white/10" : "text-white/50 ring-1 ring-white/15"
              } ${hoje ? "ring-2 ring-brand-500" : ""}`}
            >
              {n > 0 ? n : dia}
              <Tooltip>
                <strong className="font-medium">{n}</strong> exame(s)
                <span className="block text-white/60">{dia} de {calendario.mes}</span>
              </Tooltip>
            </span>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-white/60">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/25" /> dia com exame (nº de laudos)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> dia mais movimentado</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-brand-500" /> hoje</span>
      </div>
    </div>
  );
}

/* ---------- Produção por funcionário: barras empilhadas com legenda ---------- */
export function PorFuncionario({ dados }: { dados: Dashboard["porFuncionario"] }) {
  if (dados.length === 0) return <Vazio texto="Nenhum laudo no período." />;
  const max = Math.max(...dados.map((d) => d.finalizados + d.rascunhos));
  return (
    <div className="flex flex-1 flex-col px-4 pb-5">
      <div className="mb-4 flex gap-4 text-[12px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: COR.bom }} /> Finalizados</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: COR.regular }} /> Em rascunho</span>
      </div>
      <ul className="flex flex-1 flex-col justify-around gap-3.5">
        {dados.map((d) => {
          const t = d.finalizados + d.rascunhos;
          return (
            <li key={d.nome}>
              <div className="mb-1 flex justify-between text-[13px]">
                <span className="truncate text-ink">{d.nome}</span>
                <span className="text-muted tabular-nums">
                  <span className="font-medium text-ink">{d.finalizados}</span> / {t}
                </span>
              </div>
              <div className="flex h-2.5 gap-[2px]" style={{ width: `${(t / max) * 100}%` }}>
                {d.finalizados > 0 && (
                  <div tabIndex={0} className="group relative rounded-l-full outline-none last:rounded-r-full" style={{ flexGrow: d.finalizados, background: COR.bom }}>
                    <Tooltip><strong className="font-medium">{d.finalizados}</strong> finalizados</Tooltip>
                  </div>
                )}
                {d.rascunhos > 0 && (
                  <div tabIndex={0} className="group relative rounded-r-full outline-none first:rounded-l-full" style={{ flexGrow: d.rascunhos, background: COR.regular }}>
                    <Tooltip><strong className="font-medium">{d.rascunhos}</strong> em rascunho</Tooltip>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Pendências: rascunhos com itens faltando ---------- */
export function Pendencias({ itens, gerente }: { itens: Dashboard["pendencias"]; gerente: boolean }) {
  if (itens.length === 0) return <Vazio texto="Nenhum rascunho pendente. Tudo em dia!" />;
  return (
    <ul className="px-2 pb-3">
      {itens.map((p) => (
        <li key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-canvas">
          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${p.faltando.length ? "bg-[#faf1dc] text-[#9a640b]" : "bg-[#e8f6e3] text-[#239b44]"}`}>
            {p.faltando.length ? <CircleAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] text-ink">{p.nome}</div>
            <div className="truncate text-[12px] text-muted">
              {p.faltando.length ? `Falta: ${p.faltando.join(", ")}` : "Pronto para finalizar"}
              {gerente && ` · ${p.autor}`} · {relativo(p.updatedAt)}
            </div>
          </div>
          <Link href={`/laudos/${p.id}`} className="btn-secondary min-h-[30px] rounded-full px-3 py-1 text-[11.5px]">
            Abrir
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Atividade recente ---------- */
export function Recentes({ itens, gerente }: { itens: Dashboard["recentes"]; gerente: boolean }) {
  if (itens.length === 0) return <Vazio texto="Nenhum laudo ainda." />;
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-x-3 px-2 pb-3 md:grid-cols-[repeat(2,minmax(0,1fr))] 2xl:grid-cols-[repeat(3,minmax(0,1fr))]">
      {itens.map((l) => {
        const thumb = fileUrl(l.fotoPrincipal);
        return (
          <li key={l.id}>
            <Link href={`/laudos/${l.id}`} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-canvas">
              <div className="grid h-9 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-subtle">
                {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-3.5 w-3.5 text-muted" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] text-ink">{[l.artista, l.titulo].filter(Boolean).join(" - ") || "Laudo sem título"}</div>
                <div className="truncate text-[12px] text-muted">{gerente ? `${l.author.name} · ` : ""}{relativo(l.updatedAt)}</div>
              </div>
              <StatusBadge status={l.status} />
              <ChevronRight className="h-4 w-4 text-[#c4c4c4] transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export { fmt };
