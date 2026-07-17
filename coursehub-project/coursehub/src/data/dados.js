export const courses = [
  {
    id: 1,
    title: "React do Zero ao Dashboard",
    category: "Front-end",
    description:
      "Aprenda React criando interfaces reais, rotas, componentes reutilizáveis e dashboards modernos.",
    expandedDescription:
      "Um curso prático para aprender React construindo uma aplicação real do zero, com foco em componentes, props, estado, rotas, layouts e estrutura de dashboard.",
    image:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee",
    level: "Iniciante",
    duration: "24h",
    price: "R$ 197",
    ementa: [
      "Fundamentos do React",
      "Componentes reutilizáveis",
      "Props e useState",
      "React Router",
      "Layouts públicos e privados",
      "Criação de dashboard",
      "Boas práticas de organização",
    ],
    professores: ["Marina Costa", "Lucas Andrade"],
  },
  {
    id: 2,
    title: "JavaScript Essencial",
    category: "Programação",
    description:
      "Domine funções, arrays, objetos, eventos, promises e lógica para projetos web.",
    expandedDescription:
      "Curso focado nos fundamentos mais importantes de JavaScript para quem quer criar aplicações web com mais segurança, lógica e autonomia.",
    image:
      "https://images.unsplash.com/photo-1627398242454-45a1465c2479",
    level: "Iniciante",
    duration: "18h",
    price: "R$ 147",
    ementa: [
      "Variáveis e tipos de dados",
      "Condicionais e loops",
      "Funções",
      "Arrays e objetos",
      "Manipulação de DOM",
      "Eventos",
      "Promises e async/await",
    ],
    professores: ["Rafael Mendes"],
  },
  {
    id: 3,
    title: "UX/UI para Sistemas Web",
    category: "Design",
    description:
      "Aprenda a criar layouts bonitos, organizados e fáceis de usar para produtos digitais.",
    expandedDescription:
      "Curso para desenvolver olhar de produto e interface, com foco em hierarquia visual, usabilidade, organização de telas, consistência e experiência do usuário.",
    image:
      "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e",
    level: "Intermediário",
    duration: "12h",
    price: "R$ 167",
    ementa: [
      "Princípios de UX",
      "Hierarquia visual",
      "Wireframes",
      "Design de interfaces",
      "Cores, tipografia e espaçamento",
      "Design para dashboards",
      "Prototipação de telas",
    ],
    professores: ["Bianca Torres", "Eduardo Lima"],
  },
  {
    id: 4,
    title: "Tailwind CSS na Prática",
    category: "Estilização",
    description:
      "Construa páginas modernas com Tailwind, responsividade, cards, navbars e dashboards.",
    expandedDescription:
      "Curso prático de estilização com Tailwind CSS, ensinando como criar interfaces modernas, responsivas e bem estruturadas sem escrever CSS tradicional.",
    image:
      "https://images.unsplash.com/photo-1507721999472-8ed4421c4af2",
    level: "Iniciante",
    duration: "10h",
    price: "R$ 97",
    ementa: [
      "Instalação do Tailwind",
      "Classes utilitárias",
      "Cores e espaçamento",
      "Flexbox e Grid",
      "Responsividade",
      "Cards e navbars",
      "Estilização de dashboards",
    ],
    professores: ["Camila Rocha"],
  },
  {
  id: 5,
  title: "Node.js e APIs REST",
  category: "Back-end",
  description:
    "Aprenda a criar servidores, rotas e APIs modernas utilizando Node.js e Express.",
  expandedDescription:
    "Curso focado no desenvolvimento back-end com Node.js, ensinando criação de APIs REST, rotas, middlewares, integração com banco de dados e organização profissional de projetos.",
  image:
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31",
  level: "Intermediário",
  duration: "20h",
  price: "R$ 247",
  ementa: [
    "Introdução ao Node.js",
    "Express.js",
    "Criação de rotas",
    "Middlewares",
    "CRUD completo",
    "Integração com banco de dados",
    "Estruturação de APIs REST",
  ],
  professores: ["Gabriel Martins", "Felipe Rocha"],
},

{
  id: 6,
  title: "Figma para Desenvolvedores",
  category: "Design",
  description:
    "Aprenda a transformar interfaces modernas em projetos organizados e profissionais.",
  expandedDescription:
    "Curso prático de Figma voltado para desenvolvedores front-end e designers que desejam criar interfaces modernas, wireframes, sistemas de design e protótipos interativos.",
  image:
    "https://images.unsplash.com/photo-1545239351-1141bd82e8a6",
  level: "Iniciante",
  duration: "14h",
  price: "R$ 127",
  ementa: [
    "Introdução ao Figma",
    "Auto Layout",
    "Wireframes",
    "Design Systems",
    "Protótipos interativos",
    "Organização de arquivos",
    "Handoff para desenvolvimento",
  ],
  professores: ["Amanda Freitas"],
},

{
  id: 7,
  title: "Git & GitHub Profissional",
  category: "Ferramentas",
  description:
    "Domine versionamento de código, branches, pull requests e colaboração em projetos reais.",
  expandedDescription:
    "Curso completo de Git e GitHub para desenvolvedores que desejam trabalhar profissionalmente em equipe, organizar projetos e publicar portfólios modernos.",
  image:
    "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb",
  level: "Iniciante",
  duration: "8h",
  price: "R$ 87",
  ementa: [
    "Fundamentos do Git",
    "Commits e histórico",
    "Branches",
    "Merge e conflitos",
    "GitHub",
    "Pull Requests",
    "Fluxo de trabalho profissional",
  ],
  professores: ["Ricardo Alves"],
},

{
  id: 8,
  title: "UI Animations com Framer Motion",
  category: "Front-end",
  description:
    "Crie animações modernas, fluidas e profissionais para aplicações React.",
  expandedDescription:
    "Curso focado em animações para interfaces modernas utilizando Framer Motion em aplicações React, incluindo transições, animações de entrada, hover effects e microinterações.",
  image:
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
  level: "Intermediário",
  duration: "11h",
  price: "R$ 157",
  ementa: [
    "Introdução ao Framer Motion",
    "Animações básicas",
    "Transitions",
    "Hover effects",
    "Page transitions",
    "Microinterações",
    "Integração com React",
  ],
  professores: ["Leonardo Campos", "Juliana Prado"],
}
];