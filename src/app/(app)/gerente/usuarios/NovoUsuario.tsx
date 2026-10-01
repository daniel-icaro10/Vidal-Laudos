"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { criarUsuario } from "@/app/actions/admin";

export default function NovoUsuario() {
  const [state, action, pending] = useActionState(criarUsuario, undefined);
  return (
    <form action={action} className="card p-5">
      <div className="mb-4 flex items-center gap-2.5 text-[15.5px] font-medium tracking-[-0.25px] text-ink">
        <span className="icon-chip h-8 w-8"><UserPlus className="h-4 w-4" strokeWidth={1.75} /></span> Novo usuário
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_160px_auto] sm:items-end">
        <div><label className="label">Nome</label><input name="name" required className="input" /></div>
        <div><label className="label">E-mail</label><input name="email" type="email" required className="input" /></div>
        <div><label className="label">Senha inicial</label><input name="senha" type="text" minLength={6} required className="input" /></div>
        <div>
          <label className="label">Perfil</label>
          <select name="role" className="input">
            <option value="FUNCIONARIO">Funcionário</option>
            <option value="GERENTE">Gerente</option>
          </select>
        </div>
        <button className="btn-primary" disabled={pending}>Adicionar</button>
      </div>
      {state?.error && <p className="mt-3 rounded-xl bg-[#fcebe7] px-3 py-2 text-[13px] text-[#ed4b38]">{state.error}</p>}
      {state?.ok && <p className="mt-3 rounded-xl bg-[#e8f6e3] px-3 py-2 text-[13px] text-[#239b44]">{state.ok}</p>}
    </form>
  );
}
