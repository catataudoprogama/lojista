/* Peças e configurações de EXEMPLO do modo demonstração.
   Não vão para o Supabase: lá o lojista cadastra as peças reais pelo painel. */
window.LUME_SEED = {
  settings: {
    store_name: 'Lume Moda',
    tagline: 'Básicos com caimento certo',
    whatsapp: '',
    instagram: '',
    address: '',
    hours: '',
    announcement: 'Frete grátis em compras acima de R$ 250',
    free_shipping_min: 250,
    hero_title: 'Menos, mas melhor.',
    hero_subtitle: 'Peças atemporais para usar todo dia, com caimento que faz sentido.',
    hero_image: '',
    logo_url: ''
  },
  products: [
    {
      id: 'demo-camiseta-essencial', name: 'Camiseta Essencial', category: 'Camisetas', price: 89.9,
      description: 'Malha macia, gola canelada e caimento reto. A base de qualquer look.',
      colors: ['Off-white', 'Preto', 'Areia'], featured: true, daysAgo: 3,
      sizes: [{ size: 'P', qty: 3 }, { size: 'M', qty: 5 }, { size: 'G', qty: 4 }, { size: 'GG', qty: 2 }],
      images: ['assets/img/demo/camiseta-essencial-1.svg', 'assets/img/demo/camiseta-essencial-2.svg']
    },
    {
      id: 'demo-camiseta-oversized', name: 'Camiseta Oversized', category: 'Camisetas', price: 109.9, compare_at_price: 129.9,
      description: 'Modelagem ampla, ombro caído e comprimento um pouco mais longo.',
      colors: ['Preto', 'Cinza'], featured: false, daysAgo: 30,
      sizes: [{ size: 'P', qty: 0 }, { size: 'M', qty: 1 }, { size: 'G', qty: 1 }, { size: 'GG', qty: 1 }],
      images: ['assets/img/demo/camiseta-oversized-1.svg', 'assets/img/demo/camiseta-oversized-2.svg']
    },
    {
      id: 'demo-regata-canelada', name: 'Regata Canelada', category: 'Camisetas', price: 69.9,
      description: 'Canelado elástico que acompanha o corpo sem apertar.',
      colors: ['Off-white', 'Preto'], featured: false, daysAgo: 45,
      sizes: [{ size: 'P', qty: 4 }, { size: 'M', qty: 4 }, { size: 'G', qty: 2 }],
      images: ['assets/img/demo/regata-canelada-1.svg', 'assets/img/demo/regata-canelada-2.svg']
    },
    {
      id: 'demo-camisa-linho', name: 'Camisa de Linho', category: 'Camisas', price: 189.9,
      description: 'Leve, fresca e com textura natural. Fica boa aberta ou abotoada.',
      colors: ['Areia', 'Verde-oliva'], featured: true, daysAgo: 6,
      sizes: [{ size: 'P', qty: 2 }, { size: 'M', qty: 3 }, { size: 'G', qty: 3 }, { size: 'GG', qty: 1 }],
      images: ['assets/img/demo/camisa-linho-1.svg', 'assets/img/demo/camisa-linho-2.svg']
    },
    {
      id: 'demo-moletom-canguru', name: 'Moletom Canguru', category: 'Moletons', price: 219.9,
      description: 'Capuz duplo, bolso frontal e interior felpado.',
      colors: ['Cinza mescla', 'Preto'], featured: true, daysAgo: 20,
      sizes: [{ size: 'M', qty: 2 }, { size: 'G', qty: 3 }, { size: 'GG', qty: 2 }],
      images: ['assets/img/demo/moletom-canguru-1.svg', 'assets/img/demo/moletom-canguru-2.svg']
    },
    {
      id: 'demo-calca-alfaiataria', name: 'Calça Alfaiataria', category: 'Calças', price: 229.9, compare_at_price: 269.9,
      description: 'Corte reto, cintura alta e vinco marcado. Vai do trabalho ao jantar.',
      colors: ['Preto', 'Caramelo'], featured: false, daysAgo: 35,
      sizes: [{ size: '38', qty: 2 }, { size: '40', qty: 3 }, { size: '42', qty: 3 }, { size: '44', qty: 1 }],
      images: ['assets/img/demo/calca-alfaiataria-1.svg', 'assets/img/demo/calca-alfaiataria-2.svg']
    },
    {
      id: 'demo-calca-wide-leg', name: 'Calça Wide Leg', category: 'Calças', price: 209.9,
      description: 'Perna larga e cintura alta, em tecido com queda fluida.',
      colors: ['Areia', 'Preto'], featured: false, daysAgo: 60,
      sizes: [{ size: '38', qty: 0 }, { size: '40', qty: 0 }, { size: '42', qty: 0 }, { size: '44', qty: 0 }],
      images: ['assets/img/demo/calca-wide-leg-1.svg', 'assets/img/demo/calca-wide-leg-2.svg']
    },
    {
      id: 'demo-bermuda-linho', name: 'Bermuda de Linho', category: 'Bermudas', price: 139.9,
      description: 'Cós com elástico interno e bolsos laterais. Pronta para o calor.',
      colors: ['Areia', 'Azul'], featured: false, daysAgo: 40,
      sizes: [{ size: 'P', qty: 3 }, { size: 'M', qty: 4 }, { size: 'G', qty: 3 }],
      images: ['assets/img/demo/bermuda-linho-1.svg', 'assets/img/demo/bermuda-linho-2.svg']
    },
    {
      id: 'demo-short-alfaiataria', name: 'Short Alfaiataria', category: 'Bermudas', price: 119.9,
      description: 'Cintura alta, pregas suaves e comprimento acima do joelho.',
      colors: ['Preto', 'Off-white'], featured: false, daysAgo: 50,
      sizes: [{ size: '38', qty: 2 }, { size: '40', qty: 2 }, { size: '42', qty: 2 }],
      images: ['assets/img/demo/short-alfaiataria-1.svg', 'assets/img/demo/short-alfaiataria-2.svg']
    },
    {
      id: 'demo-vestido-slip', name: 'Vestido Slip', category: 'Vestidos', price: 199.9,
      description: 'Alças finas, decote em V e saia fluida que se move com você.',
      colors: ['Preto', 'Champagne'], featured: true, daysAgo: 10,
      sizes: [{ size: 'P', qty: 2 }, { size: 'M', qty: 2 }, { size: 'G', qty: 1 }],
      images: ['assets/img/demo/vestido-slip-1.svg', 'assets/img/demo/vestido-slip-2.svg']
    },
    {
      id: 'demo-jaqueta-sarja', name: 'Jaqueta Sarja', category: 'Jaquetas', price: 299.9,
      description: 'Sarja encorpada, bolsos no peito e fechamento por botões.',
      colors: ['Caramelo'], featured: false, daysAgo: 25,
      sizes: [{ size: 'M', qty: 2 }, { size: 'G', qty: 2 }, { size: 'GG', qty: 1 }],
      images: ['assets/img/demo/jaqueta-sarja-1.svg', 'assets/img/demo/jaqueta-sarja-2.svg']
    },
    {
      id: 'demo-bolsa-tote', name: 'Bolsa Tote', category: 'Acessórios', price: 99.9,
      description: 'Estrutura simples, alças firmes e espaço para o dia inteiro.',
      colors: ['Cru', 'Preto'], featured: false, daysAgo: 55,
      sizes: [{ size: 'Único', qty: 8 }],
      images: ['assets/img/demo/bolsa-tote-1.svg', 'assets/img/demo/bolsa-tote-2.svg']
    }
  ]
};
