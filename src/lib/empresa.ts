// Dados fixos do cabeçalho/rodapé do laudo.
export const EMPRESA = {
  razaoSocial: "Vidal Arquitetura e Restauração LTDA.",
  tituloPt: "LAUDO DE CONSERVAÇÃO DE OBRA DE ARTE",
  tituloEn: "ARTWORK CONDITION REPORT",
  slogan: "Restauração e conservação de bens culturais móveis",
  rodape1: "Vidal Arquitetura e Restauração LTDA - CNPJ 33.000.115/0001-35",
  rodape2: "Rua Prof. Ernest Marcus, 63 - São Paulo – SP - Brasil - Tel +55 11 5532 0777 -",
  site: "www.atelierderestauro.com.br",
};

export const ESTADOS = [
  { value: "GOOD", label: "Good", pt: "Bom" },
  { value: "FAIR", label: "Fair", pt: "Regular" },
  { value: "SEVERE", label: "Severe (unstable)", pt: "Grave (instável)" },
] as const;

export function formatDataExtenso(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  if (!y || !m || !d) return iso;
  return `${d} de ${meses[m - 1]} de ${y}`;
}
