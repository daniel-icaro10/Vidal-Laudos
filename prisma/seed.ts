import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Glossário transcrito do laudo de referência (numeração original — o nº 32 não existe no modelo).
const DANOS: [number, string, string][] = [
  [1, "Abaulamento", "bulge"],
  [2, "Abertura", "opening"],
  [3, "Abrasão", "abrasion"],
  [4, "Acréscimo", "accretion"],
  [5, "Adesivo", "adhesive"],
  [6, "Afundamento", "depression"],
  [7, "Alteração cromática", "color alteration"],
  [8, "Amarelamento", "yellowing"],
  [9, "Amassado", "wrinkle"],
  [10, "Arranhão", "scratch or gouge"],
  [11, "Bolha", "blister"],
  [12, "Bolor", "mould"],
  [13, "Brilho", "shine"],
  [14, "Craquelê", "craquelure"],
  [15, "Corrosão", "corrosion or rust"],
  [16, "Corte", "cut"],
  [17, "Deformação", "deformation"],
  [18, "Depressão", "sagging"],
  [19, "Delaminação", "peeling"],
  [20, "Desfibramento", "shredding"],
  [21, "Desgaste", "wear"],
  [22, "Deslocamento", "displacement"],
  [23, "Desprendimento", "detachment"],
  [24, "Diferença de brilho", "brightness difference"],
  [25, "Desfiado", "fraying"],
  [26, "Digital", "finger"],
  [27, "Dobra", "crease"],
  [28, "Empenamento", "warping"],
  [29, "Enrugado", "wrinkled"],
  [30, "Esbranquiçado", "blanching"],
  [31, "Escorrido", "runs or drips"],
  [33, "Escurecimento", "darkening"],
  [34, "Espelhamento", "mirroring"],
  [35, "Fio solto", "loose thread"],
  [36, "Fissura", "fissure"],
  [37, "Fitas adesivas", "tapes"],
  [38, "Foxing", "foxing"],
  [39, "Fratura", "fracture"],
  [40, "Fungo", "fungus or bloom"],
  [41, "Furo", "hole"],
  [42, "Frágil", "fragile"],
  [43, "Insetos", "insect"],
  [44, "Intervenção anterior", "previous repair"],
  [45, "Lasca", "chip"],
  [46, "Mancha", "stain"],
  [47, "Marca", "spot or mark"],
  [48, "Mossa", "dint"],
  [49, "Ondulação", "buckling"],
  [50, "Prego", "nail"],
  [51, "Oxidação", "oxidation"],
  [52, "Parte quebrada", "broken parts"],
  [53, "Parte solta", "loose parts"],
  [54, "Pelo de pincel", "brush bristle"],
  [55, "Perda de parte", "part loss"],
  [56, "Pontos brancos", "white dots"],
  [57, "Pontos escuros", "dark dots"],
  [58, "Próprio", "own"],
  [59, "Rachaduras", "split"],
  [60, "Rasgo", "tear"],
  [61, "Relevo", "embossment"],
  [62, "Remendo", "patch or mend"],
  [63, "Resíduo", "residue"],
  [64, "Respingo de tinta", "paint splash"],
  [65, "Retoque", "retouch"],
  [66, "Risco", "mark"],
  [67, "Ruga", "wrinkle"],
  [68, "Saliência", "bulges"],
  [69, "Sujidade", "surface dirt"],
  [70, "Trama aberta", "open mesh"],
  [71, "Trinca", "crack"],
  [72, "Vestígios", "traces"],
  [73, "Vinco", "dent"],
];

// grupo 1 = coluna esquerda, grupo 2 = coluna direita (como no modelo)
const EMBALAGEM: [number, string, string][] = [
  [1, "caixa de madeira", "wooden box"],
  [1, "caixa dupla", "double box"],
  [1, "caixa de papelão", "cardboard box"],
  [1, "glassine", ""],
  [1, "soft packing", ""],
  [1, "plástico bolha", "bubble wrap"],
  [1, "papel siliconado", "silicone paper"],
  [1, "Ethafoam", ""],
  [1, "TNT", ""],
  [1, "melinex", ""],
  [1, "tyvek", ""],
  [1, "papel seda", "tissue paper"],
  [2, "moldura", "frame"],
  [2, "vidro", "glass"],
  [2, "acrílico", "acrylic"],
  [2, "enrolada", "curled up"],
  [2, "dividida em partes", "divided into parts"],
  [2, "com outras obras", "with other artwork"],
  [2, "sem embalagem", "without packing"],
];

async function main() {
  const senhaInicial = process.env.SEED_PASSWORD || "vidal123";
  const senha = await bcrypt.hash(senhaInicial, 10);

  await prisma.user.upsert({
    where: { email: "gerente@vidal.com" },
    update: {},
    create: { name: "Flavia Vidal", email: "gerente@vidal.com", passwordHash: senha, role: "GERENTE" },
  });
  await prisma.user.upsert({
    where: { email: "funcionario@vidal.com" },
    update: {},
    create: { name: "Funcionário Teste", email: "funcionario@vidal.com", passwordHash: senha, role: "FUNCIONARIO" },
  });

  if ((await prisma.danoTermo.count()) === 0) {
    await prisma.danoTermo.createMany({ data: DANOS.map(([numero, pt, en]) => ({ numero, pt, en })) });
  }
  if ((await prisma.embalagemItem.count()) === 0) {
    await prisma.embalagemItem.createMany({
      data: EMBALAGEM.map(([grupo, pt, en], i) => ({ grupo, pt, en, ordem: i })),
    });
  }

  console.log(`Seed concluído. Usuários: gerente@vidal.com / funcionario@vidal.com${process.env.SEED_PASSWORD ? "" : " — senha: vidal123"}`);
}

main().finally(() => prisma.$disconnect());
