/* eslint-disable @next/next/no-img-element */
import { Camera, Check, FileCheck2, ShieldCheck } from "lucide-react";
import LoginForm from "./LoginForm";

const RECURSOS = [
  { icon: Camera, titulo: "Registro fotográfico", texto: "Fotos com legenda direto do celular, durante o exame." },
  { icon: FileCheck2, titulo: "PDF no padrão do atelier", texto: "Laudo bilíngue gerado automaticamente." },
  { icon: ShieldCheck, titulo: "Acesso por perfil", texto: "Funcionários e gerência com permissões separadas." },
];

// Grade decorativa no estilo do calendário do dashboard de referência
const CELULAS = ["n", "n", "c", "c", "h", "c", "g", "c", "n", "c", "c", "h", "c", "c", "n", "c", "g", "c", "c", "h", "n"];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen gap-4 p-4 lg:grid-cols-[1.05fr_1fr]">
      <section className="hidden flex-col rounded-[20px] bg-graphite p-10 text-white shadow-card lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white p-0.5">
            <img src="/logo.png" alt="" className="h-full w-full object-contain mix-blend-multiply" />
          </div>
          <span className="text-[20px] font-medium tracking-[-0.44px]">Vidal Laudos</span>
        </div>

        <div className="mt-auto">
          <div className="mb-8 grid w-fit grid-cols-7 gap-2">
            {CELULAS.map((c, i) => (
              <span
                key={i}
                className={`grid h-9 w-9 place-items-center rounded-full ${
                  c === "g" ? "bg-brand-500 text-brand-900" : c === "c" ? "bg-white/20" : c === "h" ? "bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.25)_0_2px,transparent_2px_6px)] ring-1 ring-white/20" : "ring-1 ring-white/15"
                }`}
              >
                {c === "c" && <Check className="h-4 w-4 text-white/90" />}
                {c === "g" && <Check className="h-4 w-4" />}
              </span>
            ))}
          </div>
          <h2 className="max-w-md text-[34px] leading-[1.15] font-medium tracking-[-0.9px]">
            Laudos de conservação, <span className="text-brand-500">do exame ao PDF.</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {RECURSOS.map(({ icon: Icon, titulo, texto }) => (
              <li key={titulo} className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 shadow-[inset_0_0_6px_1px_rgba(255,255,255,0.25)]">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-[14px] font-medium tracking-[-0.14px]">{titulo}</div>
                  <div className="text-[12.5px] text-white/60">{texto}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex items-center justify-center px-2 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white p-0.5 shadow-card">
              <img src="/logo.png" alt="" className="h-full w-full object-contain mix-blend-multiply" />
            </div>
            <span className="text-[20px] font-medium tracking-[-0.44px] text-graphite">Vidal Laudos</span>
          </div>
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-graphite">Entrar</h1>
          <p className="mt-1 mb-8 text-[13px] text-muted">Use o e-mail e a senha cadastrados pela gerência.</p>
          <div className="card p-6">
            <LoginForm />
          </div>
          <p className="mt-6 text-center text-[12px] text-muted">Vidal Arquitetura e Restauração LTDA</p>
        </div>
      </section>
    </main>
  );
}
