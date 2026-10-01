# Laudos de Conservação — Vidal Arquitetura e Restauração

Sistema para criar laudos de conservação de obras de arte (Artwork Condition Report) e gerar o PDF no modelo da empresa.

## Perfis

- **Funcionário**: vê só os próprios laudos, cria e edita enquanto estão em rascunho, gera o PDF e finaliza.
- **Gerente**: vê todos os laudos e filtra por funcionário, edita e reabre laudos finalizados, cadastra usuários (com senha e assinatura) e mantém as listas de danos e de embalagem.

## Como rodar

Requisitos: Node 20+ e Google Chrome ou Microsoft Edge instalado (usado para gerar o PDF).

```bash
npm install
cp .env.example .env      # troque AUTH_SECRET
npm run setup             # cria o banco e os dados iniciais
npm run dev               # http://localhost:3000
```

Usuários iniciais (troque as senhas no primeiro acesso, em "Perfil"):

| Perfil      | E-mail                | Senha    |
|-------------|-----------------------|----------|
| Gerente     | gerente@vidal.com     | vidal123 |
| Funcionário | funcionario@vidal.com | vidal123 |

Produção: `npm run build` e depois `npm start`.

### Dados de demonstração

Para ver o painel com volume de dados:

```bash
npm run db:demo          # cria ~45 laudos e 2 funcionários fictícios (@demo.vidal)
npm run db:demo:limpar   # remove tudo o que foi criado pelo comando acima
```

Os laudos de demonstração têm o comentário iniciado em `[DEMO]`. Rode `db:demo:limpar` antes de usar o sistema de verdade.

## Deploy no Render

O repositório já traz `Dockerfile` (com Chromium para o PDF) e `render.yaml`.

1. No Render: **New + → Blueprint** e selecione este repositório. O Render lê o `render.yaml`.
2. Preencha `SEED_PASSWORD`, a senha inicial de `gerente@vidal.com` e `funcionario@vidal.com`. O `AUTH_SECRET` é gerado automaticamente.
3. `DEMO_DATA=true` popula o painel com laudos fictícios. Para começar vazio, use `false`.

> **Atenção (plano free):** o disco é temporário. Banco e fotos voltam ao estado inicial a cada deploy, reinício ou após ~15 min sem acesso, quando a instância hiberna. Serve para apresentação. Para uso real, use um plano com disco persistente (veja o bloco `disk` comentado no `render.yaml`) ou migre para Postgres e armazenamento de arquivos externo.

Variáveis aceitas: `DATABASE_URL`, `UPLOAD_DIR`, `AUTH_SECRET`, `CHROME_PATH`, `APP_URL`, `SEED_PASSWORD` e `DEMO_DATA`.

## Painel

Página inicial após o login (`/painel`). Todo o painel respeita o filtro de período (3, 6 ou 12 meses, ou tudo):

- indicadores: laudos no período, taxa de finalização, fotos registradas e tempo médio até finalizar
- laudos por mês, com o mês atual em destaque e a tabela de dados disponível
- estado de conservação (Bom, Regular, Grave), com cores validadas para daltonismo e sempre acompanhadas de ícone e rótulo
- calendário de exames do mês, danos mais frequentes, rascunhos pendentes (com o que falta preencher) e atividade recente
- produção por funcionário (somente para o gerente)

O funcionário vê só os próprios laudos. O gerente vê os de todos.

## O laudo

O formulário tem 7 etapas, que correspondem às páginas do modelo:

1. **Ficha técnica**: artista, título, data, material, dimensões, coleção, exposição e foto principal
2. **Estado e exame**: Good / Fair / Severe, comentários, local, data e examinador
3. **Frente / Verso**
4. **Detalhes**: quantas fotos forem necessárias, com legenda e ordem (6 por página no PDF)
5. **Danos**: glossário bilíngue; os itens marcados saem circulados no PDF
6. **Embalagem**: fotos, checklist de materiais e "outros"
7. **Revisão**: conferência, visualização, download do PDF e finalização

O salvamento é automático. As fotos são reduzidas no navegador antes do envio, para economizar dados no celular.

## Estrutura

- `prisma/schema.prisma`: modelo de dados (SQLite em desenvolvimento; para Postgres, troque o `provider`)
- `prisma/seed.ts`: usuários iniciais, glossário de danos (73 termos do modelo) e materiais de embalagem
- `src/app/(app)/`: telas logadas (laudos, gerente, perfil)
- `src/app/imprimir/[id]/`: layout A4 do laudo (HTML/CSS), usado na visualização e no PDF
- `src/app/api/laudos/[id]/pdf`: gera o PDF com Chrome headless
- `src/lib/empresa.ts`: textos do cabeçalho e rodapé (razão social, CNPJ, endereço)
- `uploads/`: fotos e assinaturas (fora do `public`, servidas com checagem de permissão)

## Pendências conhecidas

- `public/logo.png` foi recortado do laudo de referência e está em baixa resolução. Substitua pelo arquivo original.
- O glossário do modelo não tem o item 32. Ele pode ser incluído em **Listas**.
