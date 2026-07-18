import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FooterSection } from '@/components/landing/AnimatedSections';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, BookOpen } from 'lucide-react';

// Blog posts content - loaded via glob
const blogPosts = import.meta.glob('/src/content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Frontmatter parser
function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const [, frontmatter, body] = match;
  const data: Record<string, unknown> = {};

  frontmatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      const value = valueParts.join(':').trim();
      // Remove quotes
      const cleanValue = value.replace(/^["']|["']$/g, '');
      data[key.trim()] = cleanValue;
    }
  });

  return { data, body };
}

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const estimateReadTime = (text: string): string => {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min de leitura`;
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<string | null>(null);
  const [frontmatter, setFrontmatter] = useState<Record<string, unknown>>({});
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      return;
    }

    const key = `/src/content/blog/${slug}.md`;
    const postContent = blogPosts[key];

    if (!postContent) {
      setNotFound(true);
      return;
    }

    const { data, body } = parseFrontmatter(postContent);
    setFrontmatter(data);
    setContent(body);
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Post não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            Este artigo não existe ou foi removido.
          </p>
          <Button onClick={() => navigate('/blog')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Blog
          </Button>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const readTime = estimateReadTime(content);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/blog')}
          className="mb-8 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar ao Blog
        </Button>

        {/* Article header */}
        <article>
          <header className="mb-10">
            {/* Category badge */}
            {Boolean(frontmatter.category) && (
              <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                <BookOpen className="w-3 h-3 mr-1" />
                {frontmatter.category as string}
              </Badge>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              {frontmatter.title as string}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {Boolean(frontmatter.date) && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(frontmatter.date as string)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {readTime}
              </span>
              {Boolean(frontmatter.author) && (
                <span className="text-muted-foreground/70">
                  Por {frontmatter.author as string}
                </span>
              )}
            </div>
          </header>

          {/* Divider */}
          <div className="border-t border-border mb-10" />

          {/* Article content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold text-foreground mt-10 mb-4">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-muted-foreground mb-4 space-y-1">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-muted-foreground">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/50 pl-4 my-6 italic text-muted-foreground/90">
                    {children}
                  </blockquote>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic">{children}</em>
                ),
                hr: () => <hr className="my-8 border-border" />,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                code: ({ children }) => (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
                    {children}
                  </pre>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-border">
            <div className="bg-primary/5 rounded-xl p-6 md:p-8 text-center">
              <BookOpen className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Pratique o que você aprendeu
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Use o MilesPro para aplicar essas estratégias. Cadastre suas operações e calcule CPM automaticamente.
              </p>
              <Button onClick={() => navigate('/auth')} size="sm">
                Começar 14 Dias Grátis
              </Button>
            </div>
          </footer>
        </article>
      </main>

      <FooterSection />
    </div>
  );
}
