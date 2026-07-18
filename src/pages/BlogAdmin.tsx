import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Plus, Edit, Eye, Calendar, Tag, FolderOpen } from 'lucide-react';
import { useLocalization } from '@/hooks/useLocalization';
import { supabase } from '@/integrations/supabase/client';

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  content: string;
}

const EMPTY_POST: BlogPost = {
  slug: '',
  title: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  author: 'MilesPro',
  category: 'Estratégia',
  tags: [],
  content: '',
};

const CATEGORIES = ['Estratégia', 'Cartões', 'Programas', 'Notícias', 'Tutorial', 'Comparativo', 'Dicas'];

export default function BlogAdmin() {
  const { formatCurrency } = useLocalization();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      // In production, this would fetch from Supabase storage or a blog table
      // For now, we show the static posts list
      const postFiles = [
        'cpm-metrica-que-importa',
        'bonus-de-transferencia-calendario',
        '5-erros-milhas-comum',
        'cartoes-melhores-acumular-milhas-2026',
        'acumular-100-mil-milhas-12-meses',
        'livelo-vs-esfera-comparativo-2026',
        'transformar-milhas-passagens-internacionais',
        'validade-milhas-quando-expiram',
        'mate-sua-planilha-migrar-milespro',
        'qual-programa-milhas-melhor-smiles-livelo-latam-tudoazul',
      ];

      // Dynamic import of blog posts
      const loadedPosts: BlogPost[] = [];
      for (const slug of postFiles) {
        try {
          const module = await import(`@/content/blog/${slug}.md?raw`);
          const raw = module.default as string;
          const frontmatter = parseFrontmatter(raw);
          loadedPosts.push({ slug, ...frontmatter, content: raw });
        } catch {
          // Skip posts that can't be loaded
        }
      }
      setPosts(loadedPosts.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      logger.error('[BlogAdmin] Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  function parseFrontmatter(raw: string): Omit<BlogPost, 'slug'> {
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n/);
    const fm = fmMatch ? fmMatch[1] : '';

    const title = fm.match(/title:\s*["'](.+?)["']/)?.[1] || '';
    const description = fm.match(/description:\s*["'](.+?)["']/)?.[1] || '';
    const date = fm.match(/date:\s*["'](.+?)["']/)?.[1] || '';
    const author = fm.match(/author:\s*["'](.+?)["']/)?.[1] || 'MilesPro';
    const category = fm.match(/category:\s*["'](.+?)["']/)?.[1] || '';
    const tagsMatch = fm.match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/);
    const tags = tagsMatch
      ? tagsMatch[1].split('\n').map(t => t.replace(/^\s+-\s+/, '').trim()).filter(Boolean)
      : [];

    return { title, description, date, author, category, tags, content: raw };
  }

  function handleNewPost() {
    setEditing({ ...EMPTY_POST, slug: `novo-post-${Date.now()}` });
  }

  function handleSave() {
    if (!editing) return;
    setSaving(true);
    // In production: save to Supabase storage
    // For now: show success and close editor
    setTimeout(() => {
      setSaving(false);
      setEditing(null);
    }, 1000);
  }

  return (
    <DashboardLayout title="Blog Admin">
      <div className="space-y-6 pb-8">
        <PageHeader
          eyebrow="Conteúdo"
          icon={<FileText className="h-5 w-5" />}
          title="Gerenciamento do Blog"
          subtitle="Criar, editar e publicar posts"
        />

        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle>{editing.slug.startsWith('novo') ? 'Novo Post' : `Editando: ${editing.title}`}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Título</label>
                  <Input
                    value={editing.title}
                    onChange={e => setEditing({ ...editing, title: e.target.value })}
                    placeholder="Título do post"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Slug (URL)</label>
                  <Input
                    value={editing.slug}
                    onChange={e => setEditing({ ...editing, slug: e.target.value })}
                    placeholder="slug-do-post"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Descrição</label>
                <Textarea
                  value={editing.description}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Descrição breve do post (meta description)"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Categoria</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editing.category}
                    onChange={e => setEditing({ ...editing, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Data</label>
                  <Input
                    type="date"
                    value={editing.date}
                    onChange={e => setEditing({ ...editing, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Autor</label>
                  <Input
                    value={editing.author}
                    onChange={e => setEditing({ ...editing, author: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Tags (separar por vírgula)</label>
                <Input
                  value={editing.tags.join(', ')}
                  onChange={e => setEditing({ ...editing, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  placeholder="milhas, estratégia, cartões"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Conteúdo (Markdown)</label>
                <Textarea
                  value={editing.content}
                  onChange={e => setEditing({ ...editing, content: e.target.value })}
                  placeholder="Escreva o conteúdo em Markdown..."
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {saving ? 'Salvando...' : 'Salvar Post'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-end">
              <Button onClick={handleNewPost} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Novo Post
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Posts ({posts.length})</CardTitle>
                <CardDescription>Posts publicados no blog</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : (
                  <div className="space-y-3">
                    {posts.map(post => (
                      <div key={post.slug} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{post.title}</span>
                            <Badge variant="outline" className="text-xs shrink-0">{post.category}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{post.date}</span>
                            <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" />{post.author}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(post)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
