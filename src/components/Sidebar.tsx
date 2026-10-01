"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, LayoutDashboard, ListChecks, LogOut, Menu, Plus, UserRound, Users, X, type LucideIcon } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { criarLaudo } from "@/app/actions/laudos";

type Props = { name: string; email: string; gerente: boolean; nLaudos: number; nUsuarios: number };
type Item = { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean; count?: number };

export default function Sidebar({ name, email, gerente, nLaudos, nUsuarios }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const principal: Item[] = [
    { href: "/painel", label: "Painel", icon: LayoutDashboard, match: (p) => p.startsWith("/painel") },
    { href: "/laudos", label: gerente ? "Todos os laudos" : "Meus laudos", icon: FileText, match: (p) => p.startsWith("/laudos"), count: nLaudos },
  ];
  const gestao: Item[] = [
    { href: "/gerente/usuarios", label: "Usuários", icon: Users, match: (p) => p.startsWith("/gerente/usuarios"), count: nUsuarios },
    { href: "/gerente/listas", label: "Listas do laudo", icon: ListChecks, match: (p) => p.startsWith("/gerente/listas") },
  ];
  const conta: Item[] = [{ href: "/perfil", label: "Meu perfil", icon: UserRound, match: (p) => p.startsWith("/perfil") }];

  const iniciais = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join("");

  return (
    <>
      {/* Barra superior no celular */}
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="icon-btn" aria-label="Abrir menu">
          <Menu className="h-4 w-4" />
        </button>
        <Marca />
      </div>

      {open && <div className="fixed inset-0 z-40 bg-ink/20 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-canvas transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] lg:translate-x-0 ${
          open ? "translate-x-0 shadow-[12px_0_40px_rgba(0,0,0,0.13)]" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between px-6 pt-6 pb-4">
          <Marca />
          <button onClick={() => setOpen(false)} className="icon-btn lg:hidden" aria-label="Fechar menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3">
          <form action={criarLaudo}>
            <button className="btn-dark w-full">
              <Plus className="h-4 w-4" /> Novo laudo
            </button>
          </form>
        </div>

        <nav className="mt-6 flex-1 space-y-5 overflow-y-auto px-3">
          <Grupo titulo="Geral" itens={principal} pathname={pathname} />
          {gerente && <Grupo titulo="Gestão" itens={gestao} pathname={pathname} />}
          <Grupo titulo="Conta" itens={conta} pathname={pathname} />
        </nav>

        <div className="p-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-card">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-medium text-white">{iniciais}</div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-medium text-ink">{name}</div>
              <div className="truncate text-[11px] text-muted">{gerente ? "Gerente" : "Funcionário"} · {email}</div>
            </div>
            <form action={logout}>
              <button className="icon-btn" aria-label="Sair" title="Sair">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

function Marca() {
  return (
    <Link href="/painel" className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-white p-0.5 shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Flavia Vidal" className="h-full w-full object-contain mix-blend-multiply" />
      </div>
      <span className="text-[20px] font-medium tracking-[-0.44px] text-graphite">Vidal Laudos</span>
    </Link>
  );
}

function Grupo({ titulo, itens, pathname }: { titulo: string; itens: Item[]; pathname: string }) {
  return (
    <div>
      <div className="mb-1 px-3 text-[13px] leading-[21px] tracking-[-0.13px] text-muted">{titulo}</div>
      <ul className="space-y-0.5">
        {itens.map(({ href, label, icon: Icon, match, count }) => {
          const ativo = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex h-[38px] items-center gap-2.5 rounded-lg px-3 text-[14px] tracking-[-0.14px] whitespace-nowrap transition-colors active:scale-[0.98] ${
                  ativo ? "bg-brand-500 font-medium text-[#121212]" : "text-soft hover:bg-hover"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${ativo ? "text-[#121212]" : "text-muted"}`} strokeWidth={1.75} />
                <span className="flex-1">{label}</span>
                {count !== undefined && count > 0 && (
                  <small className={`rounded px-[5px] text-[11px] leading-4 ${ativo ? "bg-black/10" : "bg-stroke"}`}>{count}</small>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
