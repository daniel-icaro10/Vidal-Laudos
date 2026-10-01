// Dados de demonstração para o painel.
//   npm run db:demo          -> cria
//   npm run db:demo:limpar   -> remove tudo que foi criado aqui
// Tudo é identificável: usuários com e-mail @demo.vidal e laudos com comentário iniciado em "[DEMO]".
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const MARCA = "[DEMO]";

const ARTISTAS = ["Helena Prado", "Rui Matsuda", "Marta Albuquerque", "Otávio Lins", "Clara Nogueira", "Ivo Barreto", "Lúcia Tavares", "Bento Freire"];
const OBRAS = ["Paisagem com rio", "Estudo nº 4", "Retrato de família", "Composição azul", "Natureza-morta", "Sem título", "Jardim interno", "Mapa afetivo", "Horizonte", "Figura sentada"];
const MATERIAIS = ["Óleo sobre tela", "Aquarela sobre papel", "Nanquim sobre papel", "Gravura em metal", "Acrílica sobre tela", "Técnica mista"];
const EXPOSICOES = ["Margem de Dentro", "Arquivo Vivo", "Coleção em Trânsito", "Papel e Memória"];
const DANOS_COMUNS = ["Sujidade", "Ondulação", "Amarelamento", "Foxing", "Mancha", "Craquelê", "Abrasão", "Rasgo", "Fitas adesivas", "Pontos escuros"];

// gerador determinístico, para o resultado ser sempre o mesmo
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

async function limpar() {
  const laudos = await prisma.laudo.deleteMany({ where: { comentarios: { startsWith: MARCA } } });
  const users = await prisma.user.deleteMany({ where: { email: { endsWith: "@demo.vidal" } } });
  console.log(`Removidos: ${laudos.count} laudo(s) e ${users.count} usuário(s) de demonstração.`);
}

async function criar() {
  if (await prisma.laudo.count({ where: { comentarios: { startsWith: MARCA } } })) {
    console.log("Já existem dados de demonstração. Rode `npm run db:demo:limpar` antes de recriar.");
    return;
  }
  const senha = await bcrypt.hash("vidal123", 10);
  const demoUsers = await Promise.all(
    [["Ana Ribeiro", "ana@demo.vidal"], ["Carlos Mendes", "carlos@demo.vidal"]].map(([name, email]) =>
      prisma.user.upsert({ where: { email }, update: {}, create: { name, email, passwordHash: senha, role: "FUNCIONARIO" } }),
    ),
  );
  const func = await prisma.user.findUnique({ where: { email: "funcionario@vidal.com" } });
  const autores = [...demoUsers, ...(func ? [func] : [])];
  const termos = await prisma.danoTermo.findMany({ where: { pt: { in: DANOS_COMUNS } } });
  const itens = await prisma.embalagemItem.findMany({ where: { pt: { in: ["caixa de papelão", "glassine", "plástico bolha", "papel seda"] } } });

  const agora = new Date();
  let n = 0;
  for (let mesesAtras = 7; mesesAtras >= 0; mesesAtras--) {
    const qtd = 3 + Math.floor(rnd() * 5) + (mesesAtras < 3 ? 2 : 0);
    for (let i = 0; i < qtd; i++) {
      const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() - mesesAtras + 1, 0).getDate();
      const limite = mesesAtras === 0 ? agora.getDate() : diasNoMes;
      const criado = new Date(agora.getFullYear(), agora.getMonth() - mesesAtras, 1 + Math.floor(rnd() * limite), 9 + Math.floor(rnd() * 8));
      const recente = Date.now() - criado.getTime() < 10 * 86400000;
      const finalizado = !recente && rnd() < 0.8;
      const r = rnd();
      const estado = !finalizado && rnd() < 0.35 ? "" : r < 0.6 ? "GOOD" : r < 0.9 ? "FAIR" : "SEVERE";
      const atualizado = new Date(Math.min(Date.now(), criado.getTime() + (1 + rnd() * 9) * 86400000));
      const danos = [...new Set(Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => pick(termos)))];

      await prisma.laudo.create({
        data: {
          authorId: pick(autores).id,
          status: finalizado ? "FINALIZADO" : "RASCUNHO",
          createdAt: criado,
          updatedAt: atualizado,
          artista: pick(ARTISTAS),
          titulo: pick(OBRAS),
          dataObra: String(1950 + Math.floor(rnd() * 70)),
          material: pick(MATERIAIS),
          dimensoes: `${20 + Math.floor(rnd() * 80)} x ${30 + Math.floor(rnd() * 90)} cm`,
          colecao: rnd() < 0.5 ? "Do artista" : "Particular",
          exposicao: pick(EXPOSICOES),
          estado,
          comentarios: `${MARCA} Laudo de demonstração.`,
          local: "São Paulo",
          dataExame: criado.toISOString().slice(0, 10),
          examinador: "Equipe Vidal",
          danos: estado || finalizado ? { create: danos.map((t) => ({ termoId: t.id })) } : undefined,
          embalagens: finalizado ? { create: [pick(itens), pick(itens)].filter((v, k, a) => a.indexOf(v) === k).map((it) => ({ itemId: it.id })) } : undefined,
        },
      });
      n++;
    }
  }
  console.log(`Criados ${n} laudos de demonstração e ${demoUsers.length} funcionários (@demo.vidal, senha vidal123).`);
}

(process.argv.includes("--limpar") ? limpar() : criar()).finally(() => prisma.$disconnect());
