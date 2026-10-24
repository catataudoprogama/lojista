# Loja de roupas com painel do lojista — spec de design

Data: 2026-10-23 · Pasta: `Moda/Lume Moda/` · Marca fictícia "Lume Moda" (trocável pelo painel)

## Objetivo
Site de loja de roupas, moderno e minimalista, de alta conversão (poucos toques até o pedido), em que o **lojista cadastra, edita, esconde e zera estoque de peças sozinho**, inclusive subindo fotos pelo celular. O pedido fecha por **WhatsApp**; não há pagamento online.

## Decisões já tomadas com o usuário
- Edição: painel `/admin` + **Supabase** (Auth, Postgres, Storage), com **modo demo local** quando não há chaves.
- Checkout: carrinho monta a mensagem e abre o WhatsApp da loja (Pix/cartão combinados no chat).
- Material: nenhum ainda → marca fictícia + peças de exemplo. Nome, logo e catálogo reais entram depois pelo painel.
- Visual: moderno e minimalista.
- Premissa (não confirmada): roupas unisex básicas; tamanhos em texto livre (P/M/G ou 38/40/42).

## Stack
HTML/CSS/JS puros, sem build. `supabase-js` v2 por CDN (versão fixa). Hospedável em qualquer hospedagem estática.

## Estrutura de arquivos
```
Moda/Lume Moda/
  index.html                vitrine + sacola + página da peça
  admin/index.html          painel (noindex)
  assets/css/site.css, admin.css
  assets/js/config.js       SUPABASE_URL / SUPABASE_ANON_KEY (vazio = modo demo)
  assets/js/data.js         escolhe o driver e expõe a interface única
  assets/js/data-supabase.js
  assets/js/data-demo.js    localStorage, usa seed.js na primeira abertura
  assets/js/seed.js         peças e configurações de exemplo
  assets/js/site.js         vitrine, filtros, sacola, mensagem do WhatsApp
  assets/js/admin.js        login, lista, formulário, configurações
  assets/img/demo/*.svg     ilustrações minimalistas das peças de exemplo
  supabase/schema.sql       tabelas, RLS, bucket, função is_admin()
  LEIAME.md                 passo a passo de configuração e hospedagem
```

## Interface do driver de dados (`data.js`)
`mode` ("supabase"|"demo") · `listProducts({includeInactive})` · `getProduct(id)` · `saveProduct(p)` · `deleteProduct(id)` · `uploadImage(file) → url` · `getSettings()` · `saveSettings(s)` · `signIn(email, senha)` · `signOut()` · `session()`.
`site.js` e `admin.js` só falam com essa interface; trocar de driver não altera a UI.

## Modelo de dados
**products**: `id uuid pk`, `name text not null`, `description text`, `price numeric(10,2) not null`, `compare_at_price numeric(10,2)`, `category text`, `colors text[]`, `images text[]` (ordem = ordem de exibição, a primeira é a capa), `sizes jsonb` = `[{"size":"P","qty":2},…]` (peça sem grade usa `[{"size":"Único","qty":n}]`), `featured bool`, `active bool default true`, `created_at`, `updated_at`.
- **Esgotada** = ativa e soma das quantidades = 0 (aparece com selo, vai para o fim da grade, não entra na sacola).
- **Novo** = criada há menos de 21 dias (derivado, sem campo).
- **Últimas unidades** = soma das quantidades entre 1 e 3 (derivado do estoque real).

**settings** (linha única): `store_name`, `tagline`, `whatsapp` (só dígitos com DDI), `instagram`, `address`, `hours`, `announcement`, `free_shipping_min numeric null`, `hero_title`, `hero_subtitle`, `hero_image null`.

**admins**: `email`. Preenchida por uma linha editável no `schema.sql`.

## Segurança (Supabase)
- RLS ligado em todas as tabelas. Função `is_admin()` (`security definer`) compara `auth.jwt()->>'email'` com `admins`.
- `products`: leitura pública só de `active = true`, ou tudo para admin; escrita só admin. `settings`: leitura pública, escrita admin. `admins`: sem política (ninguém lê pela API).
- Bucket `produtos` público para leitura, escrita só admin.
- `LEIAME.md` manda **desativar "Allow new users to sign up"** e criar o usuário do lojista manualmente, além da checagem de `is_admin()`.
- A chave `anon` no `config.js` é pública por desenho; a proteção está nas políticas, não na chave.

## Vitrine
- Cabeçalho fixo e enxuto: marca (texto, ou logo se configurada), busca, favoritos, sacola com contador. Faixa de aviso editável.
- Hero editorial com um CTA ("Ver novidades"). Textos vêm de `settings`.
- Grade 2 colunas (celular) / 4 (desktop), imagem 4:5, segunda foto no hover, `loading=lazy`. Filtros por categoria (chips) e tamanho, ordenação (novidades, menor/maior preço), busca por nome. Selos Novo, Esgotado, −%.
- "Adicionar" no card abre folha de tamanho (bottom sheet no celular); tamanhos sem estoque riscados.
- Página da peça (`<dialog>`): galeria com swipe, cor, tamanho, preço (e preço antigo/−%), botões "Adicionar à sacola" e "Pedir pelo WhatsApp" (pedido só dessa peça), guia de tamanhos resumido, itens relacionados da mesma categoria.
- Sacola em gaveta: quantidade (limitada ao estoque do tamanho), remover, barra de progresso até o frete grátis (só se `free_shipping_min` definido), retirada ou entrega (bairro), pagamento (Pix, cartão, dinheiro), nome. Persiste em `localStorage`; itens que ficaram inativos ou esgotados são removidos com aviso. Barra fixa "Ver sacola" no celular.
- Favoritos em `localStorage`. WhatsApp flutuante. Seções: Sobre/Instagram, FAQ (trocas, entrega, pagamento), rodapé com endereço e horário (somente o que estiver em `settings`).
- Eventos em `dataLayer`/gtag/fbq se existirem: `view_item`, `add_to_cart`, `begin_checkout`, `whatsapp_click`.
- Sem depoimentos, avaliações ou números de venda inventados.
- Visual: fundo off-white `#F5F3EE`, tinta `#141414`, um único acento (variável CSS), muito espaço em branco, Instrument Sans + Instrument Serif nos detalhes, animações sutis (fade-up, zoom leve da imagem, transição do dialog), respeitando `prefers-reduced-motion`.

## Mensagem do WhatsApp
```
Olá, {loja}! Quero fazer um pedido:

1x {peça} — Tam {tam} — {cor} — R$ {preço}
…
Subtotal: R$ {total}
Entrega: {Retirada na loja | Entrega — bairro {x} (frete a combinar)}
Pagamento: {Pix | Cartão | Dinheiro}
Nome: {nome}
```
Link `https://wa.me/{whatsapp}?text={mensagem codificada}`. Sem WhatsApp configurado, o botão fica desativado com aviso.

## Painel `/admin` (mobile-first)
- Login e-mail/senha (modo demo: entra direto, com faixa "Modo demonstração — dados só neste navegador").
- Lista de peças: miniatura, nome, preço (editável na linha), estoque total, toggles **Ativa** e **Esgotada** (esgotada zera todos os tamanhos), busca e filtro por categoria. Menu por peça: Editar, Duplicar, Excluir (com confirmação).
- "+ Nova peça": fotos pela câmera ou galeria (várias), **compressão no aparelho** (lado maior 1400 px, WebP ~0,82, com fallback JPEG) antes do envio; reordenar, definir capa, remover. Campos: nome, preço, preço antigo, categoria (com sugestões das existentes), cores, descrição, destaque, tamanhos com `+`/`−` de quantidade (e atalhos P/M/G/GG e numeração).
- Aba "Loja": todos os campos de `settings`.
- Validação: nome, preço e ao menos uma foto são obrigatórios; erros de envio mostram mensagem clara e mantêm o formulário preenchido.
- Modo demo: fotos redimensionadas (900 px) guardadas como data URL em `localStorage`; se estourar a cota, o painel avisa em vez de falhar em silêncio.

## Teste
Harness CDP já usado nas outras lojas, no modo demo, em celular (375) e desktop: filtros e busca, estado de estoque (esgotado/últimas), sacola (quantidade, limite de estoque, persistência, frete grátis), texto exato da mensagem do WhatsApp, CRUD completo do painel incluindo upload de foto e reordenação, sem sobreposição de elementos no celular. **O driver Supabase não é validável sem um projeto real**: o `LEIAME.md` diz isso e inclui um roteiro de 6 passos para o primeiro teste.

## Fora de escopo (v1)
Pagamento online, gravação de pedidos no banco, baixa automática de estoque, vários usuários admin, cupons, avaliações, conta de cliente.

## Desvios do spec na construção
- `settings` ganhou `logo_url` (logo opcional enviada pelo painel, com fundo transparente); sem logo, o nome vira a marca.
- "Guia de tamanhos resumido" virou "Dúvida no tamanho?" com link para o WhatsApp: medidas de tabela seriam inventadas, e cada loja tem as suas.
- Favoritos filtram a própria grade (chip "Favoritos") em vez de abrir outra tela.
- O seletor de ordenação ficou no cabeçalho da seção; o filtro de tamanho mostra só os tamanhos com estoque.

## Pendências para o lojista real
Nome/logo/cores, WhatsApp, fotos e preços reais, e-mail do admin, domínio e hospedagem.
