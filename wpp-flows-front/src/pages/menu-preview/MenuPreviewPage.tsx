import { useMemo } from 'react';
import { Copy, ExternalLink, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/stores/uiStore';

export function MenuPreviewPage() {
  const { organization } = useAuth();
  const slug = organization?.slug ?? '';

  const url = useMemo(() => {
    if (!slug) return null;
    return `${globalThis.location.origin}/r/${slug}`;
  }, [slug]);

  const openInNewTab = () => {
    if (!url) return;
    globalThis.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado');
    } catch {
      toast.error('Não foi possível copiar — copie manualmente acima.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Visualizar cardápio"
        description="Veja exatamente como os clientes enxergam o cardápio digital. Use o link para compartilhar com sua base."
      />

      {url ? (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                  Link público
                </p>
                <p className="mt-1 truncate font-mono text-sm">{url}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" leftIcon={<Copy />} onClick={copyLink}>
                  Copiar link
                </Button>
                <Button size="sm" leftIcon={<ExternalLink />} onClick={openInNewTab}>
                  Abrir em nova aba
                </Button>
              </div>
            </CardContent>
          </Card>

          <PhoneFrame url={url} />
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Smartphone className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Defina o slug da sua organização para gerar o cardápio público.
            </p>
            <p className="text-2xs text-muted-foreground">
              Você pode ajustar isso em <strong>Configurações → Perfil</strong>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PhoneFrame({ url }: { url: string }) {
  return (
    <div className="flex justify-center">
      <div className="relative h-[720px] w-[380px] overflow-hidden rounded-[2.5rem] border-[10px] border-foreground/80 bg-foreground/80 shadow-soft-lg">
        <div className="absolute left-1/2 top-0 z-10 h-5 w-32 -translate-x-1/2 rounded-b-2xl bg-foreground/80" />
        <iframe
          title="Pré-visualização do cardápio"
          src={url}
          className="h-full w-full rounded-[2rem] bg-background"
        />
      </div>
    </div>
  );
}
