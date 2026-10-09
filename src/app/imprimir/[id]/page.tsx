/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLaudoOr404, nomeLaudo } from "@/lib/laudos";
import { fileUrl } from "@/lib/storage";
import { EMPRESA, ESTADOS, formatDataExtenso } from "@/lib/empresa";
import Toolbar from "./Toolbar";
import "./print.css";

export const metadata: Metadata = { title: "Laudo de conservação" };

// Fonte servida pelo próprio app: o PDF sai igual em qualquer servidor.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--f-sans" });

const FOTOS_POR_PAGINA = 6;
// Com muitos danos marcados, o glossário vai para uma página própria.
const MAX_DANOS_COM_GLOSSARIO = 8;

function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function dataCurta(iso: string) {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
}

/** Rótulo bilíngue usado nas células de cabeçalho das tabelas. */
function Rot({ pt, en }: { pt: string; en: string }) {
  return (
    <>
      {pt} <span className="en">/ {en}</span>
    </>
  );
}

function Check({ on }: { on: boolean }) {
  return <span className={`cb${on ? " on" : ""}`}>{on ? "X" : ""}</span>;
}

type Cab = { codigo: string; data: string; obra: string };

function Cabecalho({ cab, numero, total }: { cab: Cab; numero: number; total: number }) {
  return (
    <table className="cab">
      <tbody>
        <tr>
          <td rowSpan={3} className="logo"><img src="/logo.png" alt="Flavia Vidal — Conservação e restauro" /></td>
          <td colSpan={3} className="tit">
            <div className="empresa">{EMPRESA.razaoSocial}</div>
            <div className="pt">{EMPRESA.tituloPt}</div>
            <div className="en">{EMPRESA.tituloEn}</div>
          </td>
        </tr>
        <tr className="meta">
          <td><div className="k"><Rot pt="Código" en="Ref." /></div>{cab.codigo}</td>
          <td><div className="k"><Rot pt="Data do exame" en="Date" /></div>{cab.data}</td>
          <td><div className="k"><Rot pt="Página" en="Page" /></div>{numero} de {total}</td>
        </tr>
        <tr className="meta">
          <td colSpan={3}><div className="k"><Rot pt="Obra" en="Artwork" /></div>{cab.obra}</td>
        </tr>
      </tbody>
    </table>
  );
}

function Rodape() {
  return (
    <footer className="rodape">
      <div>
        <b>{EMPRESA.rodape1}</b> · {EMPRESA.site}
        <br />
        {EMPRESA.rodape2.replace(/\s*-\s*$/, "")}
      </div>
      <div className="slogan">{EMPRESA.slogan}</div>
    </footer>
  );
}

function Secao({ n, pt, en }: { n: number; pt: string; en: string }) {
  return (
    <div className="secao">
      {n}. {pt} <span>/ {en}</span>
    </div>
  );
}

type FotoItem = { id: string; src: string; legenda: string; n: number };

function GradeFotos({ fotos, linhas }: { fotos: FotoItem[]; linhas: number }) {
  // Completa a grade com células vazias para manter as linhas alinhadas.
  const cel: (FotoItem | null)[] = [...fotos];
  while (cel.length % 2) cel.push(null);
  return (
    <div className="grade" style={{ gridTemplateRows: `repeat(${Math.max(linhas, 1)}, 1fr)` }}>
      {cel.map((f, i) =>
        f ? (
          <figure key={f.id}>
            <div className="img"><img src={f.src} alt={f.legenda} /></div>
            <figcaption><b>Fig. {f.n}</b>{f.legenda && ` — ${f.legenda}`}</figcaption>
          </figure>
        ) : (
          <figure key={`v${i}`} className="vazia" />
        ),
      )}
    </div>
  );
}

function Glossario({ termos, marcados }: { termos: { id: string; numero: number; pt: string; en: string }[]; marcados: Set<string> }) {
  const terco = Math.ceil(termos.length / 3);
  const colunas = [termos.slice(0, terco), termos.slice(terco, terco * 2), termos.slice(terco * 2)];
  return (
    <table className="tab glossario">
      <tbody>
        {Array.from({ length: terco }, (_, r) => (
          <tr key={r}>
            {colunas.map((col, c) => {
              const t = col[r];
              if (!t) return <td key={c} colSpan={2} />;
              const on = marcados.has(t.id);
              return [
                <td key={`${c}n`} className={`n${on ? " on" : ""}`}>{t.numero}</td>,
                <td key={`${c}t`} className={on ? "on" : ""}>{t.pt} <span className="en">/ {t.en}</span></td>,
              ];
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function ImprimirLaudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const laudo = await getLaudoOr404(id, user);

  const [termos, itens] = await Promise.all([
    prisma.danoTermo.findMany({ where: { OR: [{ ativo: true }, { laudos: { some: { laudoId: id } } }] }, orderBy: { numero: "asc" } }),
    prisma.embalagemItem.findMany({ where: { OR: [{ ativo: true }, { laudos: { some: { laudoId: id } } }] }, orderBy: [{ grupo: "asc" }, { ordem: "asc" }] }),
  ]);

  const cab: Cab = {
    codigo: laudo.id.slice(-8).toUpperCase(),
    data: dataCurta(laudo.dataExame),
    obra: nomeLaudo(laudo),
  };
  const danos = new Set(laudo.danos.map((d) => d.termoId));
  const emb = new Set(laudo.embalagens.map((e) => e.itemId));
  const marcados = termos.filter((t) => danos.has(t.id));
  const fotoDanos = fileUrl(laudo.fotoDanos ?? laudo.fotoPrincipal);
  const assinatura = fileUrl(laudo.author.signaturePath);

  let fig = 0;
  const comoFoto = (f: { id: string; path: string; legenda: string }): FotoItem => ({ id: f.id, src: fileUrl(f.path)!, legenda: f.legenda, n: ++fig });

  const ficha: [string, string, string, boolean?][] = [
    ["Artista", "Artist", laudo.artista],
    ["Título", "Title", laudo.titulo, true],
    ["Data", "Date", laudo.dataObra],
    ["Técnica / material", "Medium", laudo.material],
    ["Dimensões", "Dimensions", laudo.dimensoes],
    ["Coleção", "Collection", laudo.colecao],
    ["Exposição", "Exhibition", laudo.exposicao],
  ];

  // As seções são numeradas na ordem em que aparecem (frente/verso e detalhes são opcionais).
  let sec = 0;
  const paginas: { key: string; conteudo: React.ReactNode }[] = [];

  paginas.push({
    key: "capa",
    conteudo: (
      <>
        <Secao n={++sec} pt="Identificação da obra" en="Artwork identification" />
        <table className="tab ficha">
          <tbody>
            {ficha.map(([pt, en, v, italico], i) => (
              <tr key={pt}>
                <th><Rot pt={pt} en={en} /></th>
                <td>{v ? (italico ? <i>{v}</i> : v) : "—"}</td>
                {i === 0 && (
                  <td rowSpan={ficha.length} className="foto">
                    {laudo.fotoPrincipal ? <img src={fileUrl(laudo.fotoPrincipal)!} alt="" /> : <span>Sem foto / No image</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <Secao n={++sec} pt="Estado de conservação" en="Condition" />
        <table className="tab estado">
          <tbody>
            <tr>
              {ESTADOS.map((e) => (
                <td key={e.value} className={laudo.estado === e.value ? "on" : ""}>
                  <Check on={laudo.estado === e.value} /> {e.pt} <span className="en">/ {e.label}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <div className="obs">
          <div className="k"><Rot pt="Observações" en="Additional comments" /></div>
          <p>{laudo.comentarios || "—"}</p>
        </div>

        <Secao n={++sec} pt="Exame" en="Examination" />
        <table className="tab exame">
          <thead>
            <tr>
              <th><Rot pt="Local" en="Location" /></th>
              <th><Rot pt="Data" en="Date" /></th>
              <th><Rot pt="Examinado por" en="Examiner" /></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{laudo.local || "—"}</td>
              <td>{formatDataExtenso(laudo.dataExame) || "—"}</td>
              <td>{laudo.examinador || "—"}</td>
            </tr>
          </tbody>
        </table>

        <Secao n={++sec} pt="Assinaturas" en="Signatures" />
        <table className="tab assin">
          <thead>
            <tr>
              <th><Rot pt="Conservador responsável" en="Conservator" /></th>
              <th><Rot pt="Coleção" en="Collection" /></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="campo">{assinatura && <img src={assinatura} alt="Assinatura" />}</td>
              <td className="campo" />
            </tr>
            <tr>
              <td><span className="k">Nome / Name:</span> {laudo.examinador || laudo.author.name}</td>
              <td><span className="k">Nome / Name:</span></td>
            </tr>
          </tbody>
        </table>
      </>
    ),
  });

  if (laudo.fotoFrente || laudo.fotoVerso) {
    const fotos: FotoItem[] = [];
    if (laudo.fotoFrente) fotos.push({ id: "frente", src: fileUrl(laudo.fotoFrente)!, legenda: "Frente / Front", n: ++fig });
    if (laudo.fotoVerso) fotos.push({ id: "verso", src: fileUrl(laudo.fotoVerso)!, legenda: "Verso / Back", n: ++fig });
    const n = ++sec;
    paginas.push({
      key: "fv",
      conteudo: (
        <>
          <Secao n={n} pt="Frente e verso" en="Front and back" />
          <div className="fv">
            {fotos.map((f) => (
              <figure key={f.id}>
                <div className="img"><img src={f.src} alt={f.legenda} /></div>
                <figcaption><b>Fig. {f.n}</b> — {f.legenda}</figcaption>
              </figure>
            ))}
          </div>
        </>
      ),
    });
  }

  const detalhes = laudo.fotos.filter((f) => f.tipo === "DETALHE").map(comoFoto);
  if (detalhes.length) {
    const n = ++sec;
    chunk(detalhes, FOTOS_POR_PAGINA).forEach((grupo, i) =>
      paginas.push({
        key: `d${i}`,
        conteudo: (
          <>
            <Secao n={n} pt={`Fotos de detalhe${i ? " (continuação)" : ""}`} en="Detail photographs" />
            <GradeFotos fotos={grupo} linhas={3} />
          </>
        ),
      }),
    );
  }

  const secDanos = ++sec;
  const glossarioSeparado = marcados.length > MAX_DANOS_COM_GLOSSARIO;
  const metade = Math.ceil(marcados.length / 2);
  paginas.push({
    key: "danos",
    conteudo: (
      <>
        <Secao n={secDanos} pt="Mapa de danos" en="Damage map" />
        {fotoDanos && <div className={`danos-foto${glossarioSeparado ? " grande" : ""}`}><img src={fotoDanos} alt="" /></div>}
        <table className="tab marcados">
          <colgroup><col className="n" /><col /><col className="n" /><col /></colgroup>
          <thead>
            <tr>
              <th colSpan={4}><Rot pt="Danos identificados" en="Identified damage" /></th>
            </tr>
          </thead>
          <tbody>
            {marcados.length ? (
              Array.from({ length: metade }, (_, r) => (
                <tr key={r}>
                  {[marcados[r], marcados[r + metade]].map((t, c) =>
                    t ? [
                      <td key={`${c}n`} className="n">{t.numero}</td>,
                      <td key={`${c}t`}>{t.pt} <span className="en">/ {t.en}</span></td>,
                    ] : <td key={c} colSpan={2} />,
                  )}
                </tr>
              ))
            ) : (
              <tr><td colSpan={4}>Nenhum dano assinalado <span className="en">/ No damage noted</span></td></tr>
            )}
          </tbody>
        </table>
        {!glossarioSeparado && (
          <>
            <div className="sub"><Rot pt="Glossário de referência" en="Reference glossary" /></div>
            <Glossario termos={termos} marcados={danos} />
          </>
        )}
      </>
    ),
  });
  if (glossarioSeparado) {
    paginas.push({
      key: "glossario",
      conteudo: (
        <>
          <Secao n={secDanos} pt="Mapa de danos (continuação)" en="Damage map" />
          <div className="sub"><Rot pt="Glossário de referência" en="Reference glossary" /></div>
          <Glossario termos={termos} marcados={danos} />
        </>
      ),
    });
  }

  const fotosEmb = laudo.fotos.filter((f) => f.tipo === "EMBALAGEM").map(comoFoto);
  const secEmb = ++sec;
  const grupos = [1, 2].map((g) => itens.filter((it) => it.grupo === g));
  const linhasChecklist = Math.max(grupos[0].length, grupos[1].length + 1);
  paginas.push({
    key: "emb",
    conteudo: (
      <>
        <Secao n={secEmb} pt="Embalagem" en="Packing" />
        {fotosEmb.length > 0 && (
          <div className="emb-fotos">
            <GradeFotos fotos={fotosEmb.slice(0, 2)} linhas={1} />
          </div>
        )}
        <table className="tab checklist">
          <thead>
            <tr>
              <th colSpan={2}><Rot pt="Materiais e condições" en="Materials and conditions" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: linhasChecklist }, (_, r) => (
              <tr key={r}>
                {grupos.map((grupo, g) => {
                  const it = grupo[r];
                  if (it) {
                    const on = emb.has(it.id);
                    return (
                      <td key={g} className={on ? "on" : ""}>
                        <Check on={on} /> {it.pt}{it.en && <span className="en"> / {it.en}</span>}
                      </td>
                    );
                  }
                  if (g === 1 && r === grupo.length) {
                    const on = !!laudo.embalagemOutros;
                    return (
                      <td key={g} className={on ? "on" : ""}>
                        <Check on={on} /> outros <span className="en">/ others</span>{on && `: ${laudo.embalagemOutros}`}
                      </td>
                    );
                  }
                  return <td key={g} />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ),
  });

  chunk(fotosEmb.slice(2), FOTOS_POR_PAGINA).forEach((grupo, i) =>
    paginas.push({
      key: `e${i}`,
      conteudo: (
        <>
          <Secao n={secEmb} pt="Embalagem (continuação)" en="Packing" />
          <GradeFotos fotos={grupo} linhas={3} />
        </>
      ),
    }),
  );

  return (
    <div className={`laudo-doc ${inter.variable}`}>
      <Toolbar id={laudo.id} />
      {paginas.map((p, i) => (
        <section key={p.key} className={`page pg-${p.key}`}>
          <Cabecalho cab={cab} numero={i + 1} total={paginas.length} />
          <div className="corpo">{p.conteudo}</div>
          <Rodape />
        </section>
      ))}
    </div>
  );
}
