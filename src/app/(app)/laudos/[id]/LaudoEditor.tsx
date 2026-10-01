"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  CloudOff,
  Download,
  Eye,
  Gauge,
  Images,
  Loader2,
  Lock,
  Package,
  Plus,
  RotateCcw,
  ScanSearch,
  Search,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import PhotoSlot from "@/components/PhotoSlot";
import StatusBadge from "@/components/StatusBadge";
import { enviarFoto } from "@/components/upload";
import { ESTADOS } from "@/lib/empresa";
import {
  excluirLaudo,
  finalizarLaudo,
  reabrirLaudo,
  removerFoto,
  removerFotoFixa,
  salvarLaudo,
  type Slot,
} from "@/app/actions/laudos";

type Campos = {
  artista: string;
  titulo: string;
  dataObra: string;
  material: string;
  dimensoes: string;
  colecao: string;
  exposicao: string;
  estado: "" | "GOOD" | "FAIR" | "SEVERE";
  comentarios: string;
  local: string;
  dataExame: string;
  examinador: string;
  embalagemOutros: string;
};
type Foto = { id: string; tipo: string; legenda: string; ordem: number; url: string };
type Termo = { id: string; numero: number; pt: string; en: string };
type Item = { id: string; pt: string; en: string; grupo: number };

type Props = {
  editavel: boolean;
  gerente: boolean;
  termos: Termo[];
  itens: Item[];
  laudo: {
    id: string;
    status: string;
    autor: string;
    campos: Campos;
    slots: Record<Slot, string | null>;
    fotos: Foto[];
    danos: string[];
    embalagens: string[];
  };
};

const ETAPAS: { key: string; label: string; desc: string; icon: LucideIcon }[] = [
  { key: "ficha", label: "Ficha técnica", desc: "Identificação da obra e foto principal da capa.", icon: ClipboardList },
  { key: "estado", label: "Estado e exame", desc: "Condição geral, observações e dados do exame.", icon: Gauge },
  { key: "frente", label: "Frente / Verso", desc: "Registro completo das duas faces da obra.", icon: Images },
  { key: "detalhes", label: "Detalhes", desc: "Fotos de detalhe com legenda, na ordem do laudo.", icon: ScanSearch },
  { key: "danos", label: "Danos", desc: "Marque no glossário os danos identificados.", icon: AlertTriangle },
  { key: "embalagem", label: "Embalagem", desc: "Fotos e materiais usados no acondicionamento.", icon: Package },
  { key: "revisao", label: "Revisão", desc: "Confira, gere o PDF e finalize o laudo.", icon: CheckCheck },
];
type Etapa = string;

const ESTADO_COR: Record<string, string> = {
  GOOD: "bg-[#e8f6e3]0",
  FAIR: "bg-[#faf1dc]0",
  SEVERE: "bg-[#fcebe7]0",
};

export default function LaudoEditor({ editavel, gerente, termos, itens, laudo }: Props) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>("ficha");
  const [campos, setCampos] = useState<Campos>(laudo.campos);
  const [slots, setSlots] = useState(laudo.slots);
  const [fotos, setFotos] = useState<Foto[]>(laudo.fotos);
  const [danos, setDanos] = useState<string[]>(laudo.danos);
  const [embalagens, setEmbalagens] = useState<string[]>(laudo.embalagens);
  const [status, setStatus] = useState<"ok" | "salvando" | "erro">("ok");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof Campos>(k: K, v: Campos[K]) => setCampos((c) => ({ ...c, [k]: v }));

  const payload = useMemo(
    () => ({ ...campos, danos, embalagens, fotos: fotos.map(({ id, legenda, ordem }) => ({ id, legenda, ordem })) }),
    [campos, danos, embalagens, fotos],
  );
  const serial = JSON.stringify(payload);
  // Conteúdo da última gravação bem-sucedida; "pendente" é derivado dele (sem setState em efeito,
  // que a cada tecla gerava um render síncrono extra e estourava o limite de updates do React).
  const [salvoSerial, setSalvoSerial] = useState(serial);
  const salvo: "salvo" | "pendente" | "salvando" | "erro" =
    status === "erro" ? "erro" : status === "salvando" ? "salvando" : serial !== salvoSerial ? "pendente" : "salvo";

  const salvar = useCallback(async () => {
    if (!editavel || serial === salvoSerial) return true;
    setStatus("salvando");
    try {
      const r = await salvarLaudo(laudo.id, payload);
      if (!r.ok) throw new Error(r.error);
      setSalvoSerial(serial);
      setStatus("ok");
      setSavedAt(r.savedAt ?? null);
      return true;
    } catch {
      setStatus("erro");
      return false;
    }
  }, [editavel, laudo.id, payload, serial, salvoSerial]);

  // Salvamento automático 1s depois da última alteração
  useEffect(() => {
    if (!editavel || serial === salvoSerial || status === "salvando") return;
    const t = setTimeout(salvar, 1000);
    return () => clearTimeout(t);
  }, [serial, salvoSerial, status, editavel, salvar]);

  // Aviso ao sair com alteração pendente
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (salvo === "pendente" || salvo === "salvando") e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [salvo]);

  const idx = ETAPAS.findIndex((e) => e.key === etapa);
  const atual = ETAPAS[idx];
  const irPara = (e: Etapa) => {
    setEtapa(e);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function uploadSlot(slot: Slot, file: File) {
    const r = await enviarFoto(laudo.id, file, { slot });
    setSlots((s) => ({ ...s, [slot]: r.url }));
  }
  async function removeSlot(slot: Slot) {
    await removerFotoFixa(laudo.id, slot);
    setSlots((s) => ({ ...s, [slot]: null }));
  }

  const nDetalhes = fotos.filter((f) => f.tipo === "DETALHE").length;
  const nEmbalagem = embalagens.length + (campos.embalagemOutros ? 1 : 0) + fotos.filter((f) => f.tipo === "EMBALAGEM").length;
  const completo: Record<string, boolean> = {
    ficha: !!(campos.artista && campos.titulo && slots.fotoPrincipal),
    estado: !!(campos.estado && campos.local && campos.dataExame && campos.examinador),
    frente: !!(slots.fotoFrente && slots.fotoVerso),
    detalhes: nDetalhes > 0,
    danos: danos.length > 0,
    embalagem: nEmbalagem > 0,
  };
  const nCompletas = Object.values(completo).filter(Boolean).length;
  const progresso = Math.round((nCompletas / 6) * 100);

  const titulo = [campos.artista, campos.titulo].filter(Boolean).join(" - ") || "Novo laudo";
  const dis = !editavel;

  const baixarPdf = async () => {
    if (await salvar()) window.location.href = `/api/laudos/${laudo.id}/pdf`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-28">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <nav className="mb-2 flex items-center gap-1.5 text-sm text-muted">
            <Link href="/laudos" className="hover:text-ink">Laudos</Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#c4c4c4]" />
            <span className="truncate text-soft">{titulo}</span>
          </nav>
          <h1 className="truncate text-2xl leading-[29px] font-medium tracking-[-0.72px] text-graphite">{titulo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <StatusBadge status={laudo.status} />
            <span className="text-[#c4c4c4]">•</span>
            <span>por {laudo.autor}</span>
            <span className="text-[#c4c4c4]">•</span>
            <SaveIndicator estado={salvo} savedAt={savedAt} editavel={editavel} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/imprimir/${laudo.id}`} target="_blank" className="btn-secondary" onClick={() => salvar()}>
            <Eye className="h-4 w-4" /> Visualizar
          </a>
          <button className="btn-secondary" onClick={baixarPdf}>
            <Download className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {!editavel && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c7e7bd] bg-[#e8f6e3] px-4 py-3 text-sm text-[#239b44]">
          <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Laudo finalizado — somente leitura.</span>
          {gerente && laudo.status === "FINALIZADO" && (
            <button className="btn-secondary" disabled={pending} onClick={() => startTransition(async () => { await reabrirLaudo(laudo.id); router.refresh(); })}>
              <RotateCcw className="h-4 w-4" /> Reabrir para edição
            </button>
          )}
        </div>
      )}
      {editavel && laudo.status === "FINALIZADO" && (
        <div className="flex items-center gap-2 rounded-xl border border-[#f0dcae] bg-[#faf1dc] px-4 py-3 text-sm text-[#9a640b]">
          <AlertTriangle className="h-4 w-4" /> Laudo finalizado — você está editando como gerente.
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Stepper */}
        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          {/* Celular: faixa horizontal */}
          <div className="-mx-4 overflow-x-auto px-4 lg:hidden">
            <ol className="flex min-w-max gap-2">
              {ETAPAS.map((e, i) => (
                <li key={e.key}>
                  <button
                    onClick={() => irPara(e.key)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                      etapa === e.key ? "border-graphite bg-graphite text-white" : "border-stroke bg-white text-soft"
                    }`}
                  >
                    <span className="font-mono text-[11px] opacity-70">{String(i + 1).padStart(2, "0")}</span>
                    {e.label}
                    {completo[e.key] && etapa !== e.key && <Check className="h-3.5 w-3.5 text-[#239b44]" />}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {/* Desktop: lista vertical */}
          <div className="card hidden p-3 lg:block">
            <div className="px-2 pt-1 pb-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] text-muted">Progresso</span>
                <span className="font-mono text-sm font-medium text-ink tabular-nums">{progresso}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
                <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${progresso}%` }} />
              </div>
              <div className="mt-1.5 text-xs text-muted">{nCompletas} de 6 etapas completas</div>
            </div>
            <ol className="space-y-0.5">
              {ETAPAS.map((e, i) => {
                const ativo = etapa === e.key;
                const ok = completo[e.key];
                const Icon = e.icon;
                return (
                  <li key={e.key}>
                    <button
                      onClick={() => irPara(e.key)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition ${
                        ativo ? "bg-brand-500 font-medium text-[#121212]" : "text-soft hover:bg-hover"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
                          ativo
                            ? "bg-graphite text-white ring-graphite"
                            : ok
                              ? "bg-[#e8f6e3] text-[#239b44] ring-[#239b44]/15"
                              : "bg-white text-muted ring-stroke"
                        }`}
                      >
                        {ok && !ativo ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                      </span>
                      <span className="flex-1 font-medium">{e.label}</span>
                      <span className="font-mono text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        {/* Conteúdo da etapa */}
        <section className="card min-w-0">
          <header className="flex items-start gap-4 border-b border-[#ededeb] px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chip text-white opacity-90 shadow-[inset_0_0_6px_1px_rgba(255,255,255,0.565)]">
              <atual.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] text-muted">
                Etapa {String(idx + 1).padStart(2, "0")} / {String(ETAPAS.length).padStart(2, "0")}
              </div>
              <h2 className="text-[15.5px] font-medium tracking-[-0.25px] text-ink">{atual.label}</h2>
              <p className="text-sm text-muted">{atual.desc}</p>
            </div>
          </header>

          <div className="p-5 sm:p-6">
            {etapa === "ficha" && (
              <div className="grid gap-6 2xl:grid-cols-[1fr_300px]">
                <div className="grid content-start gap-4 sm:grid-cols-2">
                  <Campo label="Artista / Artist" value={campos.artista} onChange={(v) => set("artista", v)} disabled={dis} className="sm:col-span-2" />
                  <Campo label="Título / Title" value={campos.titulo} onChange={(v) => set("titulo", v)} disabled={dis} className="sm:col-span-2" />
                  <Campo label="Data / Date" value={campos.dataObra} onChange={(v) => set("dataObra", v)} disabled={dis} placeholder="ex.: 2016" />
                  <Campo label="Dimensões / Dimensions" value={campos.dimensoes} onChange={(v) => set("dimensoes", v)} disabled={dis} placeholder="ex.: 38 x 56,5 cm" />
                  <Campo label="Material" value={campos.material} onChange={(v) => set("material", v)} disabled={dis} className="sm:col-span-2" placeholder="ex.: Tinta Sumie sobre papel" />
                  <Campo label="Coleção / Collection" value={campos.colecao} onChange={(v) => set("colecao", v)} disabled={dis} />
                  <Campo label="Exposição" value={campos.exposicao} onChange={(v) => set("exposicao", v)} disabled={dis} />
                </div>
                <div className="max-w-sm 2xl:max-w-none"><PhotoSlot label="Foto principal" hint="Aparece na capa do laudo" url={slots.fotoPrincipal} disabled={dis} onUpload={(f) => uploadSlot("fotoPrincipal", f)} onRemove={() => removeSlot("fotoPrincipal")} /></div>
              </div>
            )}

            {etapa === "estado" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <div className="label">Estado de conservação</div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {ESTADOS.map((e) => {
                      const sel = campos.estado === e.value;
                      return (
                        <label
                          key={e.value}
                          className={`relative flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                            sel ? "border-brand-500 bg-brand-50/60 ring-4 ring-brand-500/10" : "border-stroke bg-white hover:border-[#d2d2d2]"
                          } ${dis ? "cursor-default" : ""}`}
                        >
                          <input type="radio" name="estado" className="sr-only" disabled={dis} checked={sel} onChange={() => set("estado", e.value)} />
                          <span className={`h-2.5 w-2.5 rounded-full ${ESTADO_COR[e.value]} ${sel ? "ring-4 ring-black/5" : ""}`} />
                          <span className="flex-1">
                            <span className="block text-sm font-medium text-ink">{e.label}</span>
                            <span className="block text-xs text-muted">{e.pt}</span>
                          </span>
                          {sel && <Check className="h-4 w-4 text-brand-600" />}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Comentários adicionais / Additional comments</label>
                  <textarea className="input min-h-28" value={campos.comentarios} disabled={dis} onChange={(e) => set("comentarios", e.target.value)} />
                </div>
                <Campo label="Local / Location" value={campos.local} onChange={(v) => set("local", v)} disabled={dis} />
                <Campo label="Data do exame / Date" type="date" value={campos.dataExame} onChange={(v) => set("dataExame", v)} disabled={dis} />
                <Campo label="Examinado por / Examiner" value={campos.examinador} onChange={(v) => set("examinador", v)} disabled={dis} className="sm:col-span-2" />
              </div>
            )}

            {etapa === "frente" && (
              <div className="grid gap-6 sm:grid-cols-2">
                <PhotoSlot label="Frente / Front" url={slots.fotoFrente} disabled={dis} onUpload={(f) => uploadSlot("fotoFrente", f)} onRemove={() => removeSlot("fotoFrente")} />
                <PhotoSlot label="Verso / Back" url={slots.fotoVerso} disabled={dis} onUpload={(f) => uploadSlot("fotoVerso", f)} onRemove={() => removeSlot("fotoVerso")} />
              </div>
            )}

            {etapa === "detalhes" && (
              <Galeria
                laudoId={laudo.id}
                tipo="DETALHE"
                fotos={fotos}
                setFotos={setFotos}
                disabled={dis}
                descricao="Ex.: “Sujidade canto inferior esquerdo”. No PDF saem 6 fotos por página, nesta ordem."
                placeholderLegenda="Legenda da foto"
              />
            )}

            {etapa === "danos" && (
              <Danos termos={termos} selecionados={danos} setSelecionados={setDanos} disabled={dis}>
                <PhotoSlot label="Foto do mapa de danos" hint="Se vazio, usa a foto principal" url={slots.fotoDanos} disabled={dis} onUpload={(f) => uploadSlot("fotoDanos", f)} onRemove={() => removeSlot("fotoDanos")} />
              </Danos>
            )}

            {etapa === "embalagem" && (
              <div className="space-y-8">
                <Galeria laudoId={laudo.id} tipo="EMBALAGEM" fotos={fotos} setFotos={setFotos} disabled={dis} descricao="Fotos da obra embalada." placeholderLegenda="Legenda (opcional)" />
                <div>
                  <div className="label">Materiais / Packing</div>
                  <div className="grid gap-x-6 gap-y-1 rounded-xl border border-stroke p-2 sm:grid-cols-2">
                    {[1, 2].map((g) => (
                      <div key={g} className="space-y-0.5">
                        {itens.filter((i) => i.grupo === g).map((i) => (
                          <Check2
                            key={i.id}
                            checked={embalagens.includes(i.id)}
                            disabled={dis}
                            onChange={(on) => setEmbalagens((s) => (on ? [...s, i.id] : s.filter((x) => x !== i.id)))}
                          >
                            {i.pt}
                            {i.en && <span className="text-muted"> / {i.en}</span>}
                          </Check2>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <Campo label="Outros / Others" value={campos.embalagemOutros} onChange={(v) => set("embalagemOutros", v)} disabled={dis} placeholder="ex.: Glass Protection tape" />
              </div>
            )}

            {etapa === "revisao" && (
              <Revisao
                campos={campos}
                slots={slots}
                nDetalhes={nDetalhes}
                nDanos={danos.length}
                nEmbalagem={nEmbalagem}
                irPara={irPara}
                acoes={
                  <div className="flex flex-wrap gap-2">
                    <a href={`/imprimir/${laudo.id}`} target="_blank" className="btn-secondary" onClick={() => salvar()}>
                      <Eye className="h-4 w-4" /> Visualizar laudo
                    </a>
                    <button className="btn-secondary" onClick={baixarPdf}>
                      <Download className="h-4 w-4" /> Baixar PDF
                    </button>
                    {editavel && laudo.status === "RASCUNHO" && (
                      <button
                        className="btn-primary"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            if (!confirm("Finalizar o laudo? Depois disso só o gerente poderá reabri-lo para edição.")) return;
                            if (!(await salvar())) return;
                            await finalizarLaudo(laudo.id);
                            router.refresh();
                          })
                        }
                      >
                        <CheckCheck className="h-4 w-4" /> Finalizar laudo
                      </button>
                    )}
                    {editavel && (
                      <button
                        className="btn-danger sm:ml-auto"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            if (!confirm("Excluir este laudo e todas as fotos? Esta ação não pode ser desfeita.")) return;
                            await excluirLaudo(laudo.id);
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </button>
                    )}
                  </div>
                }
              />
            )}
          </div>
        </section>
      </div>

      {/* Navegação inferior */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stroke bg-white/85 backdrop-blur-xl lg:left-64">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-8">
          <button className="btn-secondary" disabled={idx === 0} onClick={() => irPara(ETAPAS[idx - 1].key)}>
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Anterior</span>
          </button>
          <div className="flex items-center gap-1.5">
            {ETAPAS.map((e, i) => (
              <button
                key={e.key}
                onClick={() => irPara(e.key)}
                aria-label={e.label}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-graphite" : completo[e.key] ? "w-1.5 bg-brand-500" : "w-1.5 bg-[#d2d2d2]"}`}
              />
            ))}
          </div>
          <button className="btn-primary" disabled={idx === ETAPAS.length - 1} onClick={() => irPara(ETAPAS[idx + 1].key)}>
            <span className="hidden sm:inline">Próximo</span> <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ estado, savedAt, editavel }: { estado: string; savedAt: string | null; editavel: boolean }) {
  if (!editavel) return <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Somente leitura</span>;
  if (estado === "erro")
    return <span className="inline-flex items-center gap-1.5 text-[#e0503c]"><CloudOff className="h-3.5 w-3.5" /> Erro ao salvar</span>;
  if (estado === "salvando" || estado === "pendente")
    return <span className="inline-flex items-center gap-1.5 text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-[#e8f6e3]0 shadow-[0_0_0_3px_rgba(90,171,75,0.18)]" />
      {savedAt ? `Salvo às ${new Date(savedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Tudo salvo"}
    </span>
  );
}

function Campo({
  label, value, onChange, disabled, className = "", placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; className?: string; placeholder?: string; type?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Check2({ checked, disabled, onChange, children }: { checked: boolean; disabled?: boolean; onChange: (on: boolean) => void; children: React.ReactNode }) {
  return (
    <label
      className={`flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition ${
        checked ? "bg-brand-50 font-medium text-brand-900" : "text-soft"
      } ${disabled ? "" : "cursor-pointer hover:bg-[#f5f5f2]"} ${checked && !disabled ? "hover:bg-brand-50" : ""}`}
    >
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/20 ${
          checked ? "border-graphite bg-graphite text-white" : "border-[#d2d2d2] bg-white"
        }`}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span>{children}</span>
    </label>
  );
}

function Galeria({
  laudoId, tipo, fotos, setFotos, disabled, descricao, placeholderLegenda,
}: {
  laudoId: string; tipo: "DETALHE" | "EMBALAGEM"; fotos: Foto[]; setFotos: React.Dispatch<React.SetStateAction<Foto[]>>;
  disabled: boolean; descricao: string; placeholderLegenda: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState("");
  const lista = useMemo(() => fotos.filter((f) => f.tipo === tipo).sort((a, b) => a.ordem - b.ordem), [fotos, tipo]);

  async function adicionar(files: FileList | null) {
    if (!files?.length) return;
    setErro("");
    const arr = Array.from(files);
    setEnviando(arr.length);
    for (const file of arr) {
      try {
        const { foto } = await enviarFoto(laudoId, file, { tipo });
        setFotos((fs) => [...fs, { id: foto.id, tipo, legenda: foto.legenda, ordem: foto.ordem, url: foto.url }]);
      } catch (e) {
        setErro(`${file.name}: ${(e as Error).message}`);
      }
      setEnviando((n) => n - 1);
    }
    if (input.current) input.current.value = "";
  }

  function mover(id: string, dir: -1 | 1) {
    const i = lista.findIndex((f) => f.id === id);
    const j = i + dir;
    if (j < 0 || j >= lista.length) return;
    const nova = [...lista];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    const ordens = new Map(nova.map((f, k) => [f.id, k]));
    setFotos((fs) => fs.map((f) => (ordens.has(f.id) ? { ...f, ordem: ordens.get(f.id)! } : f)));
  }

  async function remover(id: string) {
    if (!confirm("Remover esta foto?")) return;
    await removerFoto(laudoId, id);
    setFotos((fs) => fs.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-subtle px-2 py-0.5 font-mono text-xs font-medium text-soft tabular-nums">{lista.length} fotos</span>
          <p className="text-sm text-muted">{descricao}</p>
        </div>
        {!disabled && (
          <button type="button" className="btn-primary" onClick={() => input.current?.click()} disabled={enviando > 0}>
            {enviando > 0 ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando {enviando}…</> : <><Plus className="h-4 w-4" /> Adicionar fotos</>}
          </button>
        )}
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => adicionar(e.target.files)} />
      </div>
      {erro && <p className="rounded-xl bg-[#fcebe7] px-3 py-2 text-[13px] text-[#ed4b38]">{erro}</p>}
      {lista.length === 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-stroke bg-canvas p-10 text-sm text-muted transition enabled:hover:border-brand-300 enabled:hover:bg-brand-50/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-stroke">
            <Images className="h-5 w-5" />
          </span>
          <span className="font-medium text-soft">Nenhuma foto adicionada</span>
          {!disabled && <span className="text-xs">Toque para selecionar ou fotografar</span>}
        </button>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((f, i) => (
            <li key={f.id} className="group overflow-hidden rounded-xl border border-stroke bg-white transition hover:border-[#d2d2d2] hover:shadow-md">
              <div className="relative aspect-[4/3] bg-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.legenda} className="h-full w-full object-contain" />
                <span className="absolute top-2 left-2 rounded-md bg-ink/75 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white backdrop-blur">
                  #{String(i + 1).padStart(2, "0")}
                </span>
                {!disabled && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <IconBtn label="Mover para cima" disabled={i === 0} onClick={() => mover(f.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn label="Mover para baixo" disabled={i === lista.length - 1} onClick={() => mover(f.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn label="Remover" danger onClick={() => remover(f.id)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                  </div>
                )}
              </div>
              <div className="p-3">
                <input
                  className="input"
                  placeholder={placeholderLegenda}
                  value={f.legenda}
                  disabled={disabled}
                  onChange={(e) => setFotos((fs) => fs.map((x) => (x.id === f.id ? { ...x, legenda: e.target.value } : x)))}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md bg-white/95 shadow-sm ring-1 ring-stroke backdrop-blur transition disabled:opacity-40 ${
        danger ? "text-[#e0503c] hover:bg-[#fcebe7]" : "text-soft hover:bg-[#f5f5f2]"
      }`}
    >
      {children}
    </button>
  );
}

function Danos({
  termos, selecionados, setSelecionados, disabled, children,
}: {
  termos: Termo[]; selecionados: string[]; setSelecionados: React.Dispatch<React.SetStateAction<string[]>>; disabled: boolean; children: React.ReactNode;
}) {
  const [busca, setBusca] = useState("");
  const [soMarcados, setSoMarcados] = useState(false);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const visiveis = termos.filter(
    (t) => (!soMarcados || selecionados.includes(t.id)) && (!busca || norm(`${t.numero} ${t.pt} ${t.en}`).includes(norm(busca))),
  );
  const marcados = termos.filter((t) => selecionados.includes(t.id));

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
      <div className="space-y-4">
        {children}
        {marcados.length > 0 && (
          <div>
            <div className="label">Marcados ({marcados.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {marcados.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-600/15">
                  <span className="font-mono text-brand-500">{t.numero}</span> {t.pt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Buscar dano…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <button
            type="button"
            onClick={() => setSoMarcados((v) => !v)}
            className={`btn border ${soMarcados ? "border-graphite bg-graphite text-white" : "border-stroke bg-white text-soft hover:bg-[#f5f5f2]"}`}
          >
            Só marcados <span className="font-mono text-xs tabular-nums opacity-80">{selecionados.length}</span>
          </button>
        </div>
        <div className="grid max-h-[60vh] gap-x-2 overflow-y-auto rounded-xl border border-stroke p-2 sm:grid-cols-2 2xl:grid-cols-3">
          {visiveis.map((t) => (
            <Check2
              key={t.id}
              checked={selecionados.includes(t.id)}
              disabled={disabled}
              onChange={(on) => setSelecionados((s) => (on ? [...s, t.id] : s.filter((x) => x !== t.id)))}
            >
              <span className="font-mono text-xs text-muted tabular-nums">{String(t.numero).padStart(2, "0")}</span> {t.pt}{" "}
              <span className="font-normal text-muted">/ {t.en}</span>
            </Check2>
          ))}
          {visiveis.length === 0 && <p className="p-3 text-sm text-muted">Nenhum termo encontrado.</p>}
        </div>
      </div>
    </div>
  );
}

function Revisao({
  campos, slots, nDetalhes, nDanos, nEmbalagem, irPara, acoes,
}: {
  campos: Campos; slots: Record<Slot, string | null>; nDetalhes: number; nDanos: number; nEmbalagem: number;
  irPara: (e: Etapa) => void; acoes: React.ReactNode;
}) {
  const itens: [string, boolean, Etapa, string?][] = [
    ["Artista e título", !!(campos.artista && campos.titulo), "ficha"],
    ["Material e dimensões", !!(campos.material && campos.dimensoes), "ficha"],
    ["Foto principal", !!slots.fotoPrincipal, "ficha"],
    ["Estado de conservação", !!campos.estado, "estado"],
    ["Local, data e examinador", !!(campos.local && campos.dataExame && campos.examinador), "estado"],
    ["Fotos de frente e verso", !!(slots.fotoFrente && slots.fotoVerso), "frente"],
    ["Fotos de detalhe", nDetalhes > 0, "detalhes", `${nDetalhes} foto(s)`],
    ["Danos identificados", nDanos > 0, "danos", `${nDanos} marcado(s)`],
    ["Embalagem", nEmbalagem > 0, "embalagem", `${nEmbalagem} item(ns)`],
  ];
  const pendentes = itens.filter((i) => !i[1]).length;
  return (
    <div className="space-y-6">
      <div
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${
          pendentes === 0 ? "bg-[#e8f6e3] text-[#239b44] ring-[#239b44]/15" : "bg-[#faf1dc] text-[#9a640b] ring-[#9a640b]/20"
        }`}
      >
        {pendentes === 0 ? <CheckCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        {pendentes === 0 ? "Tudo preenchido. O laudo está pronto para ser finalizado." : `${pendentes} item(ns) sem preenchimento — o laudo pode ser gerado assim mesmo.`}
      </div>
      <ul className="divide-y divide-[#ededeb] overflow-hidden rounded-xl border border-stroke">
        {itens.map(([label, ok, e, extra]) => (
          <li key={label}>
            <button onClick={() => irPara(e)} className="group flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-[#f5f5f2]">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-inset ${
                  ok ? "bg-[#e8f6e3] text-[#239b44] ring-[#239b44]/20" : "bg-[#faf1dc] text-[#9a640b] ring-[#9a640b]/20"
                }`}
              >
                {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="text-xs font-bold">!</span>}
              </span>
              <span className="flex-1 text-ink">
                {label}
                {extra && <span className="ml-2 font-mono text-xs text-muted">{extra}</span>}
              </span>
              <span className="text-xs text-muted transition group-hover:text-brand-600">Editar</span>
              <ChevronRight className="h-4 w-4 text-[#c4c4c4] transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </button>
          </li>
        ))}
      </ul>
      {acoes}
    </div>
  );
}
