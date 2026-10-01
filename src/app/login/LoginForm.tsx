"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { login } from "@/app/actions/auth";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="input py-2.5" placeholder="nome@empresa.com" />
      </div>
      <div>
        <label className="label" htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className="input py-2.5" placeholder="••••••••" />
      </div>
      {state?.error && <p className="rounded-xl bg-[#fcebe7] px-3 py-2 text-[13px] text-[#ed4b38]">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Entrar <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}
