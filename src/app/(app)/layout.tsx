import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const gerente = user.role === "GERENTE";
  const [nLaudos, nUsuarios] = await Promise.all([
    prisma.laudo.count({ where: gerente ? {} : { authorId: user.id } }),
    gerente ? prisma.user.count({ where: { active: true } }) : Promise.resolve(0),
  ]);
  return (
    <div className="min-h-screen">
      <Sidebar name={user.name} email={user.email} gerente={gerente} nLaudos={nLaudos} nUsuarios={nUsuarios} />
      <div className="lg:pl-64">
        <main className="w-full px-4 py-5 sm:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
