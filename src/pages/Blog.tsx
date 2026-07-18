import { useState, useEffect } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FooterSection } from '@/components/landing/AnimatedSections';
import { BookOpen, Clock, ArrowRight, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

// Blog post metadata
interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  readTime: string;
}

// Static data - in production this would come from an API/CMS
const blogPosts: BlogPost[] = [
  {
    slug: 'cpm-metrica-que-importa',
    title: 'CPM: A Métrica Que Define Se Você Está Comprando Milhas Caro ou Barato',
    description: 'O Custo Por Milha (CPM) é a única conta que importa antes de fazer qualquer operação. Aprenda a calcular e interpretar essa métrica para nunca mais pagar caro por pontos.',
    date: '2026-05-03',
    author: 'MilesPro',
    category: 'Estratégia',
    tags: ['CPM', 'custo médio', 'compra de milhas', 'estratégia'],
    readTime: '5 min',
  },
  {
    slug: 'bonus-de-transferencia-calendario',
    title: 'Bônus de Transferência: O Calendário Que Economiza Milhares Por Ano',
    description: 'Cada programa tem janelas previsíveis de bônus de transferência. Descubra quando aproveitá-las para multiplicar seus pontos sem pagar caro.',
    date: '2026-05-03',
    author: 'MilesPro',
    category: 'Estratégia',
    tags: ['bônus', 'Livelo', 'Smiles', 'TudoAzul', 'transferência'],
    readTime: '4 min',
  },
  {
    slug: 'mate-sua-planilha-migrar-milespro',
    title: 'Mate Sua Planilha: Como Migrar Para o MilesPro em 5 Minutos',
    description: 'Sair do Excel sem perder histórico é mais fácil do que você pensa. Guia prático para migrar suas milhas e operações para o MilesPro.',
    date: '2026-05-03',
    author: 'MilesPro',
    category: 'Tutorial',
    tags: ['migração', 'Excel', 'tutorial', 'MilesPro'],
    readTime: '4 min',
  },
  {
    slug: 'cartoes-melhores-acumular-milhas-2026',
    title: 'Cartões de Crédito para Acumular Milhas: Os 7 Melhores de 2026',
    description: 'Nem todo cartão é igual na hora de acumular pontos. Descubra quais cartões mais rendem milhas no Brasil e como escolher o melhor para seu perfil de gasto.',
    date: '2026-05-03',
    author: 'MilesPro',
    category: 'Cartões',
    tags: ['cartões', 'acúmulo', 'pontos', 'cashback', 'programas fidelidade'],
    readTime: '6 min',
  },
  {
    slug: 'transformar-milhas-passagens-internacionais',
    title: 'Como Transformar Milhas em Passagens Internacionais por Menos de R$ 200',
    description: 'A maioria das pessoas paga caro por passagens porque não sabe quando e como transferir pontos. Descubra o método exato para resgatar trechos internacionais com até 80% de desconto.',
    date: '2026-05-03',
    author: 'MilesPro',
    category: 'Estratégia',
    tags: ['passagens', 'resgate', 'viagem internacional', 'Latam Pass', 'Smiles'],
    readTime: '7 min',
  },
  {
    slug: 'validade-milhas-quando-expiram',
    title: 'Quanto Tempo Valem Suas Milhas Antes de Expirarem?',
    description: 'Cada programa tem regras diferentes de validade. Descubra quando suas milhas expiram e como nunca perder pontos.',
    date: '2026-05-03',
    author: 'MilesPro',
    category: 'Estratégia',
    tags: ['validade', 'expiração', 'Livelo', 'Smiles', 'Latam Pass'],
    readTime: '5 min',
  },
  {
    slug: 'qual-programa-milhas-melhor-smiles-livelo-latam-tudoazul',
    title: 'Qual Programa é Melhor: Smiles, Livelo, Latam Pass ou TudoAzul?',
    description: 'Comparação direta entre os 4 maiores programas de milhas do Brasil. Vantagens, desvantagens, e como escolher o melhor para seu perfil.',
    date: '2026-05-03',
    author: 'MilesPro',
    category: 'Comparativo',
    tags: ['Smiles', 'Livelo', 'Latam Pass', 'TudoAzul', 'comparativo'],
    readTime: '7 min',
  },
  {
    slug: 'acumular-100-mil-milhas-12-meses',
    title: 'Como Acumular 100.000 Milhas em 12 Meses Sem Gastar Mais',
    description: 'Plano prático de acúmulo de milhas para quem não quer mudar de vida. Quanto guardar por mês, onde transferir, e como não perder pontos no caminho.',
    date: '2026-05-03',
    author: 'MilesPro',
    category: 'Tutorial',
    tags: ['acumulação', 'plano', 'cartões', 'Livelo', 'estratégia'],
    readTime: '8 min',
  },
];

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
};

export default function Blog() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState(blogPosts);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPosts(blogPosts);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredPosts(
        blogPosts.filter(
          (post) =>
            post.title.toLowerCase().includes(query) ||
            post.description.toLowerCase().includes(query) ||
            post.tags.some((tag) => tag.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Estratégia':
        return 'bg-info/10 text-info dark:text-info border-info/20';
      case 'Tutorial':
        return 'bg-success/10 text-success dark:text-success border-success/20';
      case 'Notícia':
        return 'bg-warning/10 text-warning dark:text-warning border-warning/20';
      case 'Comparativo':
        return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
      case 'Cartões':
        return 'bg-primary/10 text-primary dark:text-primary border-primary/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Blog MilesPro</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Estratégias e Guias para Economizar Mais
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Conteúdo prático sobre gestão de milhas, estratégias de compra e resgate, 
            e dicas para viajar melhor gastando menos.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar artigos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredPosts.map((post) => (
            <article
              key={post.slug}
              className="group rounded-2xl border border-border bg-card hover:border-primary/40 transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Card header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getCategoryColor(
                      post.category
                    )}`}
                  >
                    {post.category}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {post.description}
                </p>
              </div>

              {/* Card footer */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDate(post.date)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-primary hover:text-primary/80 hover:bg-primary/5 -mr-2"
                  onClick={() => navigate(`/blog/${post.slug}`)}
                >
                  Ler artigo
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </article>
          ))}
        </div>

        {/* Empty state */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum artigo encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Tente buscar por outros termos ou{' '}
              <button
                onClick={() => setSearchQuery('')}
                className="text-primary hover:underline"
              >
                veja todos os artigos
              </button>
            </p>
          </div>
        )}

        {/* CTA */}
        <section className="rounded-2xl bg-primary/5 border border-primary/10 p-8 md:p-10 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            Pratique o que você aprendeu
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Use o MilesPro para aplicar essas estratégias. Cadastre suas operações, 
            calcule CPM e never mais perca pontos.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
            Começar 14 Dias Grátis
            <ArrowRight className="w-4 h-4" />
          </Button>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}