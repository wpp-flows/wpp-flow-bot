import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PreviewVariable {
  key: string;
  label: string;
  value?: string | null;
}

interface Props {
  value: string;
  variables: PreviewVariable[];
  size?: 'sm' | 'md';
  className?: string;
}

const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function MessagePreview({
  value,
  variables,
  size = 'md',
  className,
}: Readonly<Props>) {
  const variableMap = useMemo(() => {
    const map = new Map<string, PreviewVariable>();
    for (const v of variables) map.set(v.key, v);
    return map;
  }, [variables]);

  const segments = useMemo(() => parseSegments(value, variableMap), [value, variableMap]);

  if (!value.trim()) {
    return (
      <div
        className={cn(
          'rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs italic text-muted-foreground',
          className,
        )}
      >
        Pré-visualização aparece aqui conforme você digita.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-muted/30 px-3 py-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words',
        className,
      )}
    >
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          return <span key={`t-${i}`}>{seg.text}</span>;
        }
        return (
          <VariableChip
            key={`v-${i}`}
            variable={seg.variable}
            rawKey={seg.rawKey}
            size={size}
          />
        );
      })}
    </div>
  );
}

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'variable'; variable: PreviewVariable | null; rawKey: string };

function parseSegments(
  text: string,
  variables: Map<string, PreviewVariable>,
): Segment[] {
  const out: Segment[] = [];
  let lastIndex = 0;
  VARIABLE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push({ kind: 'text', text: text.slice(lastIndex, match.index) });
    }
    const key = match[1] ?? '';
    out.push({
      kind: 'variable',
      variable: variables.get(key) ?? null,
      rawKey: key,
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    out.push({ kind: 'text', text: text.slice(lastIndex) });
  }
  return out;
}

function VariableChip({
  variable,
  rawKey,
  size,
}: {
  variable: PreviewVariable | null;
  rawKey: string;
  size: 'sm' | 'md';
}): ReactNode {
  const hasValue = !!variable?.value?.trim();
  const tone = !variable
    ? 'unknown'
    : hasValue
      ? 'filled'
      : 'placeholder';

  const display = hasValue
    ? (variable?.value ?? '').trim()
    : (variable?.label ?? rawKey);

  return (
    <span
      title={
        !variable
          ? `Variável desconhecida: {{${rawKey}}}`
          : hasValue
            ? `${variable.label} → ${display}`
            : `Aqui aparece: ${variable.label}`
      }
      className={cn(
        'mx-0.5 inline-flex items-center gap-1 rounded-md font-medium align-baseline',
        size === 'sm' ? 'px-1 py-0 text-2xs' : 'px-1.5 py-0.5 text-xs',
        tone === 'filled' &&
          'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30',
        tone === 'placeholder' &&
          'bg-primary-soft text-primary ring-1 ring-primary/30',
        tone === 'unknown' &&
          'bg-amber-100 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30',
      )}
    >
      {display}
    </span>
  );
}
