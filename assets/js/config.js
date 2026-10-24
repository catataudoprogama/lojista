/* Configuração da loja.
   Deixe SUPABASE_URL e SUPABASE_ANON_KEY vazios para rodar em MODO DEMONSTRAÇÃO
   (tudo fica salvo só no navegador de quem está testando).
   Para ligar o painel de verdade, cole aqui a Project URL e a chave pública do projeto
   (botão Connect do Supabase, ou Project Settings > API Keys): a "publishable key" (sb_publishable_...)
   ou, em projetos antigos, a "anon". Essas podem ficar no site. NUNCA cole a secret key nem a service_role
   (o site se recusa a iniciar se detectar uma delas).

   DEMO_OVERRIDE: com true, abrir o site ou o painel com ?demo=1 liga a demonstração mesmo com o Supabase
   configurado (vale na aba do navegador; ?demo=0 desfaz). Na loja de um cliente real, deixe false. */
window.LOJA_CONFIG = {
  SUPABASE_URL: 'https://wqpmqopskzclqwosabtm.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_oTsMmtlTJydtX4djQBawOw_VXc5YjP0',
  BUCKET: 'produtos',
  DEMO_OVERRIDE: true
};
