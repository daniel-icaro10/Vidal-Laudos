/* eslint-disable @next/next/no-img-element */
import { PenLine, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { removerAssinatura } from "@/app/actions/admin";
import { fileUrl } from "@/lib/storage";
import PageHeader from "@/components/PageHeader";
import PerfilForm from "./PerfilForm";

export default async function PerfilPage() {
  const user = await requireUser();
  const iniciais = user.name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Conta" title="Meu perfil" />

      <div className="card overflow-hidden">
        <div className="relative h-24 overflow-hidden bg-graphite">
          <div className="absolute right-6 bottom-4 flex gap-1.5">{[0, 1, 2, 3, 4].map((i) => <span key={i} className={`h-7 w-7 rounded-full ${i === 3 ? "bg-brand-500" : "bg-white/15"}`} />)}</div>
        </div>
        <div className="relative -mt-10 flex flex-wrap items-end gap-4 px-6 pb-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-700 text-2xl font-medium text-white ring-4 ring-white">
            {iniciais}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="text-lg font-medium tracking-[-0.44px] text-ink">{user.name}</div>
            <div className="font-mono text-xs text-muted">{user.email}</div>
          </div>
          <span className="mb-1 pill bg-[#e8f6e3] text-[#239b44]">
            {user.role === "GERENTE" ? "Gerente" : "Funcionário"}
          </span>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2.5 text-[15.5px] font-medium tracking-[-0.25px] text-ink">
          <span className="icon-chip h-8 w-8"><PenLine className="h-4 w-4" strokeWidth={1.75} /></span> Assinatura atual
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-64 items-center justify-center rounded-xl border border-dashed border-stroke bg-canvas p-2">
            {user.signaturePath ? (
              <img src={fileUrl(user.signaturePath)!} alt="Assinatura" className="max-h-full max-w-full object-contain mix-blend-multiply" />
            ) : (
              <span className="text-xs text-muted">Nenhuma assinatura enviada</span>
            )}
          </div>
          {user.signaturePath && (
            <form action={removerAssinatura}>
              <button className="btn-danger"><Trash2 className="h-4 w-4" /> Remover</button>
            </form>
          )}
        </div>
      </div>

      <PerfilForm />
    </div>
  );
}
