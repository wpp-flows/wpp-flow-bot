import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { toast } from '@/stores/uiStore';
import type { FlowWithSteps } from '@/types';

export function JsonPreview({ flow }: Readonly<{ flow: FlowWithSteps }>) {
  const [copied, setCopied] = useState(false);

  const CONTENT_LIMIT = 160;
  const truncate = (text: string) =>
    text.length > CONTENT_LIMIT ? `${text.slice(0, CONTENT_LIMIT)}…` : text;

  const buildJson = (truncateContent: boolean) =>
    JSON.stringify(
      {
        id: flow.id,
        name: flow.name,
        version: flow.version,
        isActive: flow.isActive,
        steps: flow.steps.map((s) => ({
          id: s.id,
          type: s.type,
          order: s.order,
          content: truncateContent ? truncate(s.content) : s.content,
          ...(s.metadata ? { metadata: s.metadata } : {}),
        })),
      },
      null,
      2,
    );

  const json = buildJson(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildJson(false));
      setCopied(true);
      toast.success('JSON copiado para a area de transferencia');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Falha ao copiar');
    }
  };

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-soft-sm">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
          <span className="ml-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            flow.json
          </span>
        </div>
        <IconButton size="sm" variant="ghost" onClick={handleCopy} aria-label="Copiar JSON">
          {copied ? <Check className="text-success" /> : <Copy />}
        </IconButton>
      </div>
      <pre className="h-[600px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-2xs leading-relaxed text-foreground/90 scrollbar-thin">
        {json}
      </pre>
    </div>
  );
}
