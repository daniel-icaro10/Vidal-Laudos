/* eslint-disable @next/next/no-img-element */
import { prisma } from "@/lib/db";
import { requireGerente } from "@/lib/auth";
import { atualizarUsuario } from "@/app/actions/admin";
import { fileUrl } from "@/lib/storage";
import PageHeader from "@/components/PageHeader";
import NovoUsuario from "./NovoUsuario";

const iniciais = (n: string) =>
  n.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

export default async function UsuariosPage() {
  const eu = await requireGerente();
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { laudos: true } } },
  });
  const ativos = users.filter((u) => u.active).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Gestão"
        title="Usuários"
        description={`${ativos} ativo(s) de ${users.length}. Cadastre funcionários, redefina senhas e envie a assinatura usada no laudo.`}
      />

      <NovoUsuario />

      <ul className="space-y-3">
        {users.map((u) => (
          <li key={u.id} className={`card overflow-hidden ${u.active ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-3 border-b border-[#ededeb] px-5 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-xs font-medium text-white">
                {iniciais(u.name)}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate font-medium text-ink">
                  {u.name} {u.id === eu.id && <span className="text-xs font-normal text-muted">(você)</span>}
                </div>
                <div className="truncate font-mono text-xs text-muted">{u.email}</div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  u.role === "GERENTE" ? "bg-brand-50 text-brand-700 ring-brand-600/15" : "bg-subtle text-soft ring-black/5"
                }`}
              >
                {u.role === "GERENTE" ? "Gerente" : "Funcionário"}
              </span>
              <span className="font-mono text-xs text-muted tabular-nums">{u._count.laudos} laudo(s)</span>
            </div>
            <form action={atualizarUsuario.bind(null, u.id)} className="grid gap-4 p-5 md:grid-cols-[1.2fr_1fr_1fr_1.3fr_auto] md:items-end">
              <div>
                <label className="label">Nome</label>
                <input name="name" defaultValue={u.name} className="input" />
              </div>
              <div>
                <label className="label">Perfil</label>
                <select name="role" defaultValue={u.role} className="input" disabled={u.id === eu.id}>
                  <option value="FUNCIONARIO">Funcionário</option>
                  <option value="GERENTE">Gerente</option>
                </select>
              </div>
              <div>
                <label className="label">Nova senha</label>
                <input name="senha" placeholder="deixe em branco" minLength={6} className="input" />
              </div>
              <div>
                <label className="label">Assinatura</label>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-20 shrink-0 items-center justify-center rounded-lg border border-stroke bg-white">
                    {u.signaturePath ? (
                      <img src={fileUrl(u.signaturePath)!} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-muted">sem</span>
                    )}
                  </div>
                  <input name="assinatura" type="file" accept="image/*" className="min-w-0 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-subtle file:px-2 file:py-1 file:text-xs file:font-medium file:text-soft" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-soft">
                  <input type="checkbox" name="active" defaultChecked={u.active} disabled={u.id === eu.id} className="h-4 w-4 accent-brand-600" /> Ativo
                </label>
                <button className="btn-secondary">Salvar</button>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
