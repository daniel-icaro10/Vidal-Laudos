"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { atualizarPerfil } from "@/app/actions/admin";

export default function PerfilForm() {
  const [state, action, pending] = useActionState(atualizarPerfil, undefined);
  return (
    <form action={action} className="card space-y-5 p-5">
      <div className="flex items-center gap-2.5 text-[15.5px] font-medium tracking-[-0.25px] text-ink">
        <span className="icon-chip h-8 w-8"><KeyRound className="h-4 w-4" strokeWidth={1.75} /></span> Atualizar dados
      </div>
      <div>
        <label className="label">Nova assinatura</label>
        <input
          name="assinatura"
          type="file"
          accept="image/*"
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
        />
        <p className="mt-1.5 text-xs text-muted">
          Foto ou scan da assinatura em fundo branco. Ela aparece no campo “Conservador” dos seus laudos.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Senha atual</label>
          <input name="atual" type="password" className="input" autoComplete="current-password" />
        </div>
        <div>
          <label className="label">Nova senha</label>
          <input name="nova" type="password" minLength={6} className="input" autoComplete="new-password" />
        </div>
      </div>
      {state?.error && <p className="rounded-xl bg-[#fcebe7] px-3 py-2 text-[13px] text-[#ed4b38]">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-[#e8f6e3] px-3 py-2 text-[13px] text-[#239b44]">{state.ok}</p>}
      <div className="flex justify-end">
        <button className="btn-primary" disabled={pending}>Salvar alterações</button>
      </div>
    </form>
  );
}
