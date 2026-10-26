# Loja de roupas com painel do lojista (modelo "Minha Loja", identidade SolucionaWeb)

Site estático (HTML, CSS e JS puros, sem build). O lojista cadastra e edita as peças sozinho em `/admin`.
O pedido fecha por WhatsApp: a sacola monta a mensagem e abre a conversa com a loja.

## Dois modos

| | Modo demonstração | Modo Supabase (produção) |
|---|---|---|
| Quando | `config.js` com as chaves vazias (como está) | `config.js` com URL e chave do Supabase |
| Onde ficam os dados | só no navegador de quem testa | banco e fotos na nuvem, para todos os visitantes |
| Login do painel | entra direto | e-mail e senha do lojista |
| Serve para | mostrar o site e o painel ao cliente | a loja real |

Dá para abrir `index.html` e `admin/index.html` com duplo clique para ver a demonstração. O painel e a vitrine
compartilham os dados quando abertos pelo mesmo endereço (use um servidor local ou a hospedagem, não os dois jeitos misturados).

**Demonstração com o Supabase ligado:** abrir `index.html?demo=1` (ou `admin/index.html?demo=1`) liga a demonstração naquela aba mesmo com as
chaves preenchidas. As faixas "Voltar à loja real" e "Voltar ao painel real" (ou `?demo=0`) desfazem. Na loja de um cliente real, ponha
`DEMO_OVERRIDE: false` no `config.js` para esse atalho deixar de existir.

## Rodar no seu computador e testar o login

Com o `config.js` preenchido, abra um terminal na pasta `Lume Moda` e rode:

```bash
python -m http.server 8777
```

Depois abra `http://localhost:8777/admin/` no navegador. (Abrir o arquivo com duplo clique também funciona, mas pelo endereço local o teste é mais fiel à hospedagem.)

1. Deve aparecer a tela **Entrar** (sem a faixa de demonstração). Senha errada mostra "E-mail ou senha incorretos.".
2. Entre com o e-mail e a senha criados em Authentication > Users. O painel abre com a lista vazia.
3. Um e-mail que existe no Supabase mas não está em `admins` é recusado com "Este e-mail não tem permissão de administrador desta loja." e é desconectado.
4. Se aparecer "O banco ainda não foi preparado", o `schema.sql` não foi rodado nesse projeto.
5. Se aparecer um aviso dizendo que a chave é secreta, o `config.js` tem a secret key ou a service_role: troque pela publishable key.

## Mostrar a demonstração para um lojista

1. Hospede a pasta `Lume Moda` inteira num link (por exemplo arrastando a pasta para o Netlify Drop, ou na hospedagem que você já usa)
   e abra no celular, que é onde o lojista vai usar. Os dados da demonstração ficam no navegador de quem abriu, então a
   apresentação deve ser feita no **seu** aparelho.
2. Na vitrine, mostre o filtro, a página da peça e a sacola. A faixa cinza do topo ("Modo demonstração") tem o atalho **Abrir o painel**.
3. No painel, mostre o que mais pesa na venda: trocar um preço na lista, tocar em **Esgotada**, e **Nova peça** tirando uma foto com o celular.
4. Volte à vitrine e recarregue: a peça nova já está lá.
5. Para o "uau" final, em **Loja** ponha o WhatsApp do próprio lojista e faça um pedido de teste. A conversa dele abre com o pedido pronto.
   Troque também o nome e a logo para a dele: leva dois minutos e o site passa a parecer o dele.
6. Depois da conversa, **Restaurar exemplos** (faixa preta do painel) limpa tudo para a próxima apresentação.

A faixa de demonstração da vitrine e a faixa preta do painel só aparecem no modo demonstração. Com o Supabase ligado, somem sozinhas.

## O que é o Supabase (em um minuto)

É o "lugar na internet" onde ficam as peças, as fotos e o login do lojista, para que a mudança que ele faz no painel apareça para
todos os clientes. Sem ele, o painel só funciona como demonstração, porque os dados ficam presos no navegador de quem editou.
Você só precisa dele quando fechar com um lojista. Para a demonstração, não.

Pontos que importam para quem vende para várias lojas (conferidos em [supabase.com/pricing](https://supabase.com/pricing) em out/2026, vale reconferir):

- Existe plano grátis. Nele cabem **2 projetos ativos** por conta, com 500 MB de banco e 1 GB para fotos. Uma loja pequena costuma caber folgada, já que o painel reduz cada foto antes de enviar.
- No plano grátis, projeto **sem uso por cerca de 1 semana é pausado** (basta reativar no painel do Supabase). Uma loja com visitas todo dia não pausa, mas uma demonstração esquecida pode pausar.
- O plano pago é por organização e não pausa projetos. Para mais de duas lojas, ou para não depender de reativar, considere esse plano em vez de abrir uma conta por cliente.
- A conta deve ficar em nome de quem vai cuidar da loja (você ou o lojista). Decida isso antes de criar, porque trocar depois dá trabalho.

## Colocar a loja de verdade no ar (Supabase, plano grátis)

1. Crie um projeto em supabase.com (região mais próxima, ex.: São Paulo). Guarde a senha do banco (o site não usa, mas você pode precisar um dia).
   Pode deixar as caixas de Security como vêm marcadas: o SQL do passo 4 já cuida das permissões.
2. **Authentication > Sign In / Providers**: desligue **Allow new users to sign up**. Faça isto **antes** do SQL: o script transforma em
   administrador todo usuário que existir na hora em que rodar, então ninguém além de você pode conseguir se cadastrar.
3. **Authentication > Users > Add user > Create new user**: e-mail e senha do lojista, com **Auto Confirm User** marcado. Esse será o login do painel.
   (Criar usuário pelo painel do Supabase continua funcionando com o cadastro público desligado.)
4. **SQL Editor > New query**: cole todo o `supabase/schema.sql` e clique em Run. Se o Supabase avisar de "operações destrutivas"
   (por causa dos `drop policy`), confirme: o script não apaga peças, fotos nem configurações. No fim, a lista "administradores" deve mostrar o e-mail do passo 3.
   Se for rodar de novo mais tarde, confira antes em Authentication > Users que só existem usuários que devem ser administradores.
5. Copie a **Project URL** e a **publishable key** (começa com `sb_publishable_`; em projetos mais antigos pode aparecer a chave **anon**,
   que serve igual) e cole em `assets/js/config.js`. Nunca cole a *secret key* nem a *service_role* no site.
6. Suba a pasta inteira para a hospedagem (Netlify, Cloudflare Pages, Vercel, Hostinger…). A loja fica em `/` e o painel em `/admin/`.

Segurança: a chave pública (publishable/anon) vai no site por desenho. Quem protege os dados são as regras do banco (RLS): visitantes só leem
peças ativas, e só o e-mail cadastrado na tabela `admins` consegue criar, editar, apagar e enviar fotos.
Esqueceu a senha do lojista? Redefina em Authentication > Users.

### Roteiro do primeiro teste com o Supabase real (6 passos)

O driver do Supabase foi testado só contra um cliente simulado, **nunca contra um projeto real**. Antes de entregar:

1. Abra `/admin/`: deve aparecer a tela de Entrar. Senha errada deve mostrar "E-mail ou senha incorretos.".
2. Entre com o usuário do lojista: a lista começa vazia.
3. Em **Loja**, preencha nome e WhatsApp e salve.
4. Em **Nova peça**, envie 2 fotos, escolha tamanhos, ponha estoque e salve.
5. Abra a vitrine em outra aba anônima: a peça aparece, com as fotos.
6. Desligue "Ativa" no painel: ela some da vitrine anônima depois de recarregar.

Se o passo 2 ou 4 do roteiro acima der "Sem permissão", confira o e-mail na tabela `admins` (`select * from admins;`) e se ele é idêntico ao do usuário.
Se a tabela estiver vazia, o usuário foi criado depois do SQL: confira em Authentication > Users e rode o `schema.sql` de novo.

## O que o lojista faz no painel

- **Peças**: trocar preço direto na lista, ligar/desligar "Ativa" (esconde do site sem apagar), marcar "Esgotada"
  (zera os tamanhos, com Desfazer), editar, duplicar (útil para a mesma peça em outra cor) e excluir.
- **Nova peça**: fotos pelo celular (a câmera ou a galeria), reordenar e escolher a capa; nome, preço, preço antigo
  (mostra o desconto), categoria, cores, descrição; tamanhos com quantidade de cada um.
- **Loja**: nome, logo, WhatsApp, Instagram, endereço, horário, aviso do topo, frete grátis a partir de, capa.

O site **não** baixa estoque sozinho, porque a venda fecha no WhatsApp. Depois de vender, o lojista ajusta a quantidade
(ou toca em "Esgotada"). Quando um tamanho zera, ele aparece riscado no site e sai da sacola de quem já o tinha.

## Texto que você adapta por loja

- FAQ da vitrine: lista `FAQ` no começo de `assets/js/site.js`.
- Os 3 passos "Monte a sacola / Finalize no WhatsApp / Combine o resto": `index.html` (seção `#como-funciona`).
- Os 3 destaques do hero ("Entrega rápida para todo o Brasil", "Compra segura", "Qualidade garantida"): `index.html` (lista `.hero__perks`).
  Vieram do mockup e são promessas da loja: ajuste ou apague as que não valem para o lojista.
- Identidade visual (SolucionaWeb: preto azulado, roxo neon, Montserrat): variáveis no começo de `assets/css/site.css` e `assets/css/admin.css`.
- Marca padrão do cabeçalho e do hero (SolucionaWeb): constante `BRAND` no começo de `assets/js/site.js`. Quando o lojista envia a logo
  dele em Painel > Loja, ela substitui a marca no cabeçalho e no hero. Em Loja também dá para trocar o fundo do hero ("Foto da capa").
- `og:image`, `og:url` e `<title>` em `index.html`: use endereços absolutos depois que o domínio existir.

## Arquivos

```
index.html, admin/index.html
assets/css/site.css, admin.css
assets/js/config.js       chaves do Supabase (vazio = demonstração)
assets/js/data.js         interface única de dados + utilidades (preço, estoque, compressão de foto)
assets/js/data-demo.js    driver de demonstração (localStorage)
assets/js/data-supabase.js driver do Supabase
assets/js/seed.js         peças de exemplo (só demonstração)
assets/js/site.js         vitrine, página da peça, sacola, mensagem do WhatsApp
assets/js/admin.js        painel
assets/img/demo/          ilustrações das peças de exemplo, em tons escuros (geradas por _fontes/gen_demo_svgs.py)
assets/img/hero-bg.webp, logo-s.webp, logo-solucionaweb.webp, favicon.png
                          identidade SolucionaWeb, gerada do papel de parede neon por _fontes/make_brand_assets.py
supabase/schema.sql       tabelas, regras de acesso e bucket de fotos
```

## Pendências para a loja real

Nome, logo e cores da marca; WhatsApp; fotos e preços reais; e-mail do administrador; revisar o FAQ e o texto da capa;
domínio e hospedagem. Analytics: a vitrine envia `view_item`, `add_to_cart`, `begin_checkout` e `whatsapp_click`
para `dataLayer`, `gtag` e `fbq` quando existirem na página.
