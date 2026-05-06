import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { toast } from '@/stores/uiStore';
import type { Flow } from '@/types';

export function JsonPreview({ flow }: { flow: Flow }) {
  const [copied, setCopied] = useState(false);

  const json = JSON.stringify(
    {
      id: flow.id,
      name: flow.name,
      steps: flow.steps.map((s) => ({
        id: s.id,
        type: s.type,
        content: s.content,
        ...(s.options ? { options: s.options.map((o) => ({ label: o.label, value: o.value })) } : {}),
      })),
    },
    null,
    2,
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      toast.success('JSON copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy');
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
        <IconButton size="sm" variant="ghost" onClick={handleCopy} aria-label="Copy JSON">
          {copied ? <Check className="text-success" /> : <Copy />}
        </IconButton>
      </div>
      <pre className="h-[600px] overflow-auto p-4 font-mono text-2xs leading-relaxed text-foreground/90 scrollbar-thin">
        {json}
      </pre>
    </div>
  );
}
