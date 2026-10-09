/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLaudoOr404, nomeLaudo } from "@/lib/laudos";
import { fileUrl } from "@/lib/storage";
import { EMPRESA, ESTADOS, formatDataExtenso } from "@/lib/empresa";
import Toolbar from "./Toolbar";
import "./print.css";

export const metadata: Metadata = { title: "Laudo de conservação" };

// Fontes servidas pelo próprio app: o PDF sai igual em qualquer servidor.
const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--f-serif" });
const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-sans" });

const FOTOS_POR_PAGINA = 6;

function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const dois = (n: number) => String(n).padStart(2, "0");

function Timbre({ obra }: { obra?: string }) {
  return (
    <>
      <header className="timbre">
        <img className="logo" src="/logo.png" alt="Flavia Vidal — Conservação e restauro" />
        <div className="tit">
          <div className="empresa">{EMPRESA.razaoSocial}</div>
          <div className="pt">{EMPRESA.tituloPt}</div>
          <div className="en">{EMPRESA.tituloEn}</div>
        </div>
      </header>
      {obra && (
        <div className="obra">
          <span>Obra / Artwork</span>
          {obra}
        </div>
      )}
    </>
  );
}

function Rodape({ numero, total }: { numero: number; total: number }) {
  return (
    <footer className="rodape">
      <div className="dados">
        <div>{EMPRESA.rodape1}</div>
        <div>
          {EMPRESA.rodape2} <a href={`https://${EMPRESA.site}`}>{EMPRESA.site}</a>
        </div>
      </div>
      <div className="num">
        {dois(numero)}<span> / {dois(total)}</span>
      </div>
    </footer>
  );
}

function Secao({ n, pt, en }: { n: number; pt: string; en: string }) {
  return (
    <h2 className="secao">
      <span className="n">{dois(n)}</span>
      <span className="pt">{pt}</span>
      <span className="en">{en}</span>
    </h2>
  );
}

function Check({ on }: { on: boolean }) {
  return <span className={`cb${on ? " on" : ""}`} aria-label={on ? "marcado" : "não marcado"} />;
}

function Figura({ src, legenda, n }: { src: string; legenda: string; n: number }) {
  return (
    <figure>
      <div className="quadro"><img src={src} alt={legenda} /></div>
      <figcaption>
        <span className="fig">Fig. {dois(n)}</span>
        {legenda}
      </figcaption>
    </figure>
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

  const obra = nomeLaudo(laudo);
  const danos = new Set(laudo.danos.map((d) => d.termoId));
  const emb = new Set(laudo.embalagens.map((e) => e.itemId));
  const detalhes = laudo.fotos.filter((f) => f.tipo === "DETALHE");
  const fotosEmb = laudo.fotos.filter((f) => f.tipo === "EMBALAGEM");
  const fotoDanos = fileUrl(laudo.fotoDanos ?? laudo.fotoPrincipal);
  const assinatura = fileUrl(laudo.author.signaturePath);
  const marcados = termos.filter((t) => danos.has(t.id));

  const terco = Math.ceil(termos.length / 3);
  const colunas = [termos.slice(0, terco), termos.slice(terco, terco * 2), termos.slice(terco * 2)];

  const ficha: [string, string, string, boolean?][] = [
    ["Artista", "Artist", laudo.artista],
    ["Título", "Title", laudo.titulo, true],
    ["Data", "Date", laudo.dataObra],
    ["Material", "Medium", laudo.material],
    ["Dimensões", "Dimensions", laudo.dimensoes],
    ["Coleção", "Collection", laudo.colecao],
    ["Exposição", "Exhibition", laudo.exposicao],
  ];

  // As seções são numeradas na ordem em que aparecem (frente/verso e detalhes são opcionais).
  let sec = 0;
  let fig = 0;
  const paginas: { key: string; capa?: boolean; conteudo: React.ReactNode }[] = [];

  const secIdent = ++sec;
  const secEstado = ++sec;
  const secExame = ++sec;
  paginas.push({
    key: "capa",
    capa: true,
    conteudo: (
      <>
        <Secao n={secIdent} pt="Identificação da obra" en="Artwork identification" />
        <div className="ficha">
          <dl>
            {ficha.map(([pt, en, v, italico]) => (
              <div key={pt} className="campo">
                <dt>{pt} <span>/ {en}</span></dt>
                <dd>{v ? (italico ? <i>{v}</i> : v) : "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="foto">
            {laudo.fotoPrincipal ? <img src={fileUrl(laudo.fotoPrincipal)!} alt="" /> : <span>Sem foto</span>}
          </div>
        </div>

        <Secao n={secEstado} pt="Estado de conservação" en="Condition" />
        <div className="estado">
          {ESTADOS.map((e) => (
            <div key={e.value} className={`opcao${laudo.estado === e.value ? " on" : ""}`}>
              <Check on={laudo.estado === e.value} />
              <span>{e.pt} <i>/ {e.label}</i></span>
            </div>
          ))}
        </div>
        <div className="comentarios">
          <div className="rot">Observações <span>/ Additional comments</span></div>
          <p>{laudo.comentarios || "—"}</p>
        </div>

        <Secao n={secExame} pt="Exame" en="Examination" />
        <div className="exame">
          <div><div className="rot">Local <span>/ Location</span></div>{laudo.local || "—"}</div>
          <div><div className="rot">Data <span>/ Date</span></div>{formatDataExtenso(laudo.dataExame) || "—"}</div>
          <div><div className="rot">Examinado por <span>/ Examiner</span></div>{laudo.examinador || "—"}</div>
        </div>

        <div className="assin">
          <div>
            <div className="lin">{assinatura && <img src={assinatura} alt="Assinatura" />}</div>
            <div className="cap">Conservador <span>/ Artwork conservation</span></div>
          </div>
          <div>
            <div className="lin" />
            <div className="cap">Coleção <span>/ Collection</span></div>
          </div>
        </div>
      </>
    ),
  });

  if (laudo.fotoFrente || laudo.fotoVerso) {
    const n = ++sec;
    paginas.push({
      key: "fv",
      conteudo: (
        <>
          <Secao n={n} pt="Frente e verso" en="Front and back" />
          <div className="fv">
            {laudo.fotoFrente && <Figura src={fileUrl(laudo.fotoFrente)!} legenda="Frente / Front" n={++fig} />}
            {laudo.fotoVerso && <Figura src={fileUrl(laudo.fotoVerso)!} legenda="Verso / Back" n={++fig} />}
          </div>
        </>
      ),
    });
  }

  if (detalhes.length) {
    const n = ++sec;
    chunk(detalhes, FOTOS_POR_PAGINA).forEach((grupo, i) =>
      paginas.push({
        key: `d${i}`,
        conteudo: (
          <>
            <Secao n={n} pt={`Detalhes${i ? " (cont.)" : ""}`} en="Details" />
            <div className="grade">
              {grupo.map((f) => <Figura key={f.id} src={fileUrl(f.path)!} legenda={f.legenda} n={++fig} />)}
            </div>
          </>
        ),
      }),
    );
  }

  const secDanos = ++sec;
  paginas.push({
    key: "danos",
    conteudo: (
      <>
        <Secao n={secDanos} pt="Mapa de danos" en="Damage map" />
        {fotoDanos && (
          <div className="danos-foto"><img src={fotoDanos} alt="" /></div>
        )}
        <div className="marcados">
          <div className="rot">Danos identificados <span>/ Identified damage</span></div>
          {marcados.length ? (
            <ul>
              {marcados.map((t) => (
                <li key={t.id}><b>{t.numero}</b> {t.pt} <i>/ {t.en}</i></li>
              ))}
            </ul>
          ) : (
            <p>Nenhum dano assinalado / No damage noted</p>
          )}
        </div>
        <div className="rot glossario-tit">Glossário <span>/ Glossary</span></div>
        <div className="glossario">
          {colunas.map((col, i) => (
            <div key={i}>
              {col.map((t) => (
                <div key={t.id} className={`t${danos.has(t.id) ? " on" : ""}`}>
                  <span className="n">{t.numero}</span>{t.pt} <i>/ {t.en}</i>
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
    ),
  });

  const secEmb = ++sec;
  paginas.push({
    key: "emb",
    conteudo: (
      <>
        <Secao n={secEmb} pt="Embalagem" en="Packing" />
        {fotosEmb.length > 0 && (
          <div className={`emb-fotos${fotosEmb.length === 1 ? " uma" : ""}`}>
            {fotosEmb.slice(0, 2).map((f) => <Figura key={f.id} src={fileUrl(f.path)!} legenda={f.legenda} n={++fig} />)}
          </div>
        )}
        <div className="rot checklist-tit">Materiais e condições <span>/ Materials and conditions</span></div>
        <div className="checklist">
          {[1, 2].map((g) => (
            <div key={g}>
              {itens.filter((it) => it.grupo === g).map((it) => (
                <div key={it.id} className={emb.has(it.id) ? "on" : ""}>
                  <Check on={emb.has(it.id)} />
                  <span>{it.pt}{it.en && <i> / {it.en}</i>}</span>
                </div>
              ))}
              {g === 2 && (
                <div className={`outros${laudo.embalagemOutros ? " on" : ""}`}>
                  <Check on={!!laudo.embalagemOutros} />
                  <span>outros <i>/ others</i>{laudo.embalagemOutros && <b>: {laudo.embalagemOutros}</b>}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    ),
  });

  chunk(fotosEmb.slice(2), FOTOS_POR_PAGINA).forEach((grupo, i) =>
    paginas.push({
      key: `e${i}`,
      conteudo: (
        <>
          <Secao n={secEmb} pt="Embalagem (cont.)" en="Packing" />
          <div className="grade">
            {grupo.map((f) => <Figura key={f.id} src={fileUrl(f.path)!} legenda={f.legenda} n={++fig} />)}
          </div>
        </>
      ),
    }),
  );

  return (
    <div className={`laudo-doc ${serif.variable} ${sans.variable}`}>
      <Toolbar id={laudo.id} />
      {paginas.map((p, i) => (
        <section key={p.key} className={`page${p.capa ? " capa" : ""}`}>
          <div className="faixa" aria-hidden>{EMPRESA.slogan}</div>
          <Timbre obra={p.capa ? undefined : obra} />
          <div className="corpo">{p.conteudo}</div>
          <Rodape numero={i + 1} total={paginas.length} />
        </section>
      ))}
    </div>
  );
}
