import { prisma } from "@/lib/db";
import { requireGerente } from "@/lib/auth";
import { AlertTriangle, Package } from "lucide-react";
import { salvarItemEmbalagem, salvarTermo } from "@/app/actions/admin";
import PageHeader from "@/components/PageHeader";

export default async function ListasPage() {
  await requireGerente();
  const [termos, itens] = await Promise.all([
    prisma.danoTermo.findMany({ orderBy: { numero: "asc" } }),
    prisma.embalagemItem.findMany({ orderBy: [{ grupo: "asc" }, { ordem: "asc" }] }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Gestão"
        title="Listas do laudo"
        description="Itens desativados deixam de aparecer em laudos novos, mas continuam nos laudos que já os usaram."
      />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2.5 text-[15.5px] font-medium tracking-[-0.25px] text-ink">
          <span className="icon-chip h-8 w-8"><AlertTriangle className="h-4 w-4" strokeWidth={1.75} /></span> Glossário de danos
          <span className="rounded-md bg-subtle px-2 py-0.5 font-mono text-xs font-medium text-soft">{termos.filter((t) => t.ativo).length} ativos</span>
        </h2>
        <form action={salvarTermo.bind(null, null)} className="card grid grid-cols-[70px_1fr_1fr_auto] gap-2 p-3">
          <input name="numero" type="number" placeholder="Nº" className="input" required />
          <input name="pt" placeholder="Português" className="input" required />
          <input name="en" placeholder="Inglês" className="input" />
          <button className="btn-primary">Adicionar</button>
        </form>
        <ul className="card divide-y divide-[#ededeb] overflow-x-auto">
          {termos.map((t) => (
            <li key={t.id}>
              <form
                action={salvarTermo.bind(null, t.id)}
                className={`grid min-w-[560px] grid-cols-[70px_1fr_1fr_auto_auto] items-center gap-2 px-3 py-2 ${t.ativo ? "" : "opacity-50"}`}
              >
                <input name="numero" type="number" defaultValue={t.numero} className="input py-1" />
                <input name="pt" defaultValue={t.pt} className="input py-1" />
                <input name="en" defaultValue={t.en} className="input py-1" />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name="ativo" defaultChecked={t.ativo} className="accent-brand-600" /> Ativo
                </label>
                <button className="btn-secondary px-3 py-1 text-xs">Salvar</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2.5 text-[15.5px] font-medium tracking-[-0.25px] text-ink">
          <span className="icon-chip h-8 w-8"><Package className="h-4 w-4" strokeWidth={1.75} /></span> Materiais de embalagem
          <span className="rounded-md bg-subtle px-2 py-0.5 font-mono text-xs font-medium text-soft">{itens.filter((i) => i.ativo).length} ativos</span>
        </h2>
        <form action={salvarItemEmbalagem.bind(null, null)} className="card grid grid-cols-[1fr_1fr_110px_70px_auto] gap-2 p-3">
          <input name="pt" placeholder="Português" className="input" required />
          <input name="en" placeholder="Inglês" className="input" />
          <select name="grupo" className="input">
            <option value="1">Coluna 1</option>
            <option value="2">Coluna 2</option>
          </select>
          <input name="ordem" type="number" placeholder="Ordem" className="input" defaultValue={itens.length} />
          <button className="btn-primary">Adicionar</button>
        </form>
        <ul className="card divide-y divide-[#ededeb] overflow-x-auto">
          {itens.map((i) => (
            <li key={i.id}>
              <form
                action={salvarItemEmbalagem.bind(null, i.id)}
                className={`grid min-w-[640px] grid-cols-[1fr_1fr_110px_70px_auto_auto] items-center gap-2 px-3 py-2 ${i.ativo ? "" : "opacity-50"}`}
              >
                <input name="pt" defaultValue={i.pt} className="input py-1" />
                <input name="en" defaultValue={i.en} className="input py-1" />
                <select name="grupo" defaultValue={String(i.grupo)} className="input py-1">
                  <option value="1">Coluna 1</option>
                  <option value="2">Coluna 2</option>
                </select>
                <input name="ordem" type="number" defaultValue={i.ordem} className="input py-1" />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name="ativo" defaultChecked={i.ativo} className="accent-brand-600" /> Ativo
                </label>
                <button className="btn-secondary px-3 py-1 text-xs">Salvar</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
