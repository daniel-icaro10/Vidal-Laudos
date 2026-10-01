/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLaudoOr404, nomeLaudo } from "@/lib/laudos";
import { fileUrl } from "@/lib/storage";
import { EMPRESA, ESTADOS, formatDataExtenso } from "@/lib/empresa";
import Toolbar from "./Toolbar";
import "./print.css";

export const metadata: Metadata = { title: "Laudo de conservação" };

const FOTOS_POR_PAGINA = 6;

function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function Cabecalho({ capa }: { capa?: boolean }) {
  return (
    <div className={`hdr${capa ? " capa" : ""}`}>
      <div className="bar" />
      <div className="logo"><img src="/logo.png" alt="Flavia Vidal — Conservação e restauro" /></div>
      <div className="tit">
        <div className="empresa">{EMPRESA.razaoSocial}</div>
        <div className="pt">{EMPRESA.tituloPt}</div>
        <div className="en">{EMPRESA.tituloEn}</div>
      </div>
      <div className="bar" />
    </div>
  );
}

function Rodape() {
  return (
    <div className="rodape">
      <div className="slogan">{EMPRESA.slogan}</div>
      <div className="linha" />
      <div className="dados">
        {EMPRESA.rodape1}
        <br />
        {EMPRESA.rodape2} <a href={`https://${EMPRESA.site}`}>{EMPRESA.site}</a>
      </div>
    </div>
  );
}

function Pagina({ selo, children }: { selo?: string; children: React.ReactNode }) {
  return (
    <section className="page">
      <Cabecalho capa={!selo} />
      {selo && <div className="selo">{selo}</div>}
      <div className="corpo">{children}</div>
      <Rodape />
    </section>
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

  const selo = nomeLaudo(laudo);
  const danos = new Set(laudo.danos.map((d) => d.termoId));
  const emb = new Set(laudo.embalagens.map((e) => e.itemId));
  const detalhes = laudo.fotos.filter((f) => f.tipo === "DETALHE");
  const fotosEmb = laudo.fotos.filter((f) => f.tipo === "EMBALAGEM");
  const fotoDanos = fileUrl(laudo.fotoDanos ?? laudo.fotoPrincipal);
  const assinatura = fileUrl(laudo.author.signaturePath);

  const terco = Math.ceil(termos.length / 3);
  const colunas = [termos.slice(0, terco), termos.slice(terco, terco * 2), termos.slice(terco * 2)];

  const ficha: [string, string, boolean?][] = [
    ["Artista / artist", laudo.artista],
    ["Título / Title", laudo.titulo, true],
    ["Data / Date", laudo.dataObra],
    ["Material", laudo.material],
    ["Dimensões / Dimensions", laudo.dimensoes],
    ["Coleção / Collection", laudo.colecao],
    ["EXPOSIÇÃO", laudo.exposicao],
  ];

  return (
    <div className="laudo-doc">
      <Toolbar id={laudo.id} />

      {/* 1. Capa */}
      <Pagina>
        <div className="ficha">
          <dl>
            {ficha.map(([k, v, italico]) => (
              <span key={k} className="linha-campo">
                <dt>{k}:</dt> <dd>{italico ? <i>{v}</i> : v}</dd>
              </span>
            ))}
          </dl>
          <div className="foto">{laudo.fotoPrincipal && <img src={fileUrl(laudo.fotoPrincipal)!} alt="" />}</div>
        </div>
        <div className="divisor" />
        <div className="estado">
          {ESTADOS.map((e) => (
            <span key={e.value}>
              {e.label} ( {laudo.estado === e.value ? "X" : "  "} )
            </span>
          ))}
        </div>
        <div className="comentarios">
          <b>Additional Comments:</b>
          <p>{laudo.comentarios}</p>
        </div>
        <div className="exame">
          <div>Local (Location): {laudo.local}</div>
          <div>Data (Date): {formatDataExtenso(laudo.dataExame)}</div>
          <div>Examinado por (Examiner): {laudo.examinador}</div>
        </div>
        <div className="assin">
          <div>
            <div className="lin">{assinatura && <img src={assinatura} alt="Assinatura" />}</div>
            <div className="cap">Conservador (Artwork conservation)</div>
          </div>
          <div>
            <div className="lin" />
            <div className="cap">Coleção (Collection)</div>
          </div>
        </div>
      </Pagina>

      {/* 2. Frente e verso */}
      {(laudo.fotoFrente || laudo.fotoVerso) && (
        <Pagina selo={selo}>
          <div className="fv">
            {laudo.fotoFrente && (
              <>
                <img src={fileUrl(laudo.fotoFrente)!} alt="Frente" />
                <div className="cap">Frente / Front</div>
              </>
            )}
            {laudo.fotoVerso && (
              <>
                <img src={fileUrl(laudo.fotoVerso)!} alt="Verso" />
                <div className="cap">Verso / Back</div>
              </>
            )}
          </div>
        </Pagina>
      )}

      {/* 3. Detalhes */}
      {chunk(detalhes, FOTOS_POR_PAGINA).map((grupo, i) => (
        <Pagina key={`d${i}`} selo={selo}>
          <div className="grade">
            {grupo.map((f) => (
              <figure key={f.id}>
                <img src={fileUrl(f.path)!} alt={f.legenda} />
                {f.legenda && <figcaption>{f.legenda}</figcaption>}
              </figure>
            ))}
          </div>
        </Pagina>
      ))}

      {/* 4. Mapa de danos */}
      <Pagina selo={selo}>
        {fotoDanos && (
          <div className="danos-foto">
            <img src={fotoDanos} alt="" />
          </div>
        )}
        <div className="glossario">
          {colunas.map((col, i) => (
            <div key={i}>
              {col.map((t) => (
                <div key={t.id} className={`t${danos.has(t.id) ? " on" : ""}`}>
                  <span className="n">{t.numero}.</span> {t.pt} / {t.en}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Pagina>

      {/* 5. Embalagem */}
      <Pagina selo={selo}>
        <div className="secao-titulo">EMBALAGEM - PACKING</div>
        <div className="emb-fotos">
          {fotosEmb.slice(0, 2).map((f) => (
            <img key={f.id} src={fileUrl(f.path)!} alt={f.legenda} />
          ))}
        </div>
        <div className="checklist">
          {[1, 2].map((g) => (
            <div key={g}>
              {itens.filter((it) => it.grupo === g).map((it) => (
                <div key={it.id}>
                  <span className="mk">( {emb.has(it.id) ? "X" : "  "} )</span>
                  {it.pt}{it.en ? ` / ${it.en}` : ""}
                </div>
              ))}
              {g === 2 && (
                <div className="outros">
                  <span className="mk">( {laudo.embalagemOutros ? "X" : "  "} )</span>
                  outros/others{laudo.embalagemOutros ? `: ${laudo.embalagemOutros}` : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      </Pagina>

      {chunk(fotosEmb.slice(2), FOTOS_POR_PAGINA).map((grupo, i) => (
        <Pagina key={`e${i}`} selo={selo}>
          <div className="secao-titulo">EMBALAGEM - PACKING (cont.)</div>
          <div className="grade">
            {grupo.map((f) => (
              <figure key={f.id}>
                <img src={fileUrl(f.path)!} alt={f.legenda} />
                {f.legenda && <figcaption>{f.legenda}</figcaption>}
              </figure>
            ))}
          </div>
        </Pagina>
      ))}
    </div>
  );
}
