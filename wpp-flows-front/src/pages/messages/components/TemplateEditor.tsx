import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Tooltip } from '@/components/ui/Tooltip';
import { queryKeys } from '@/lib/queryClient';
import {
  templateVariablesService,
  type OrderTemplateVariable,
} from '@/services/templateVariablesService';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  variables?: OrderTemplateVariable[];
}

export function TemplateEditor({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
  variables,
}: Readonly<Props>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const variablesQ = useQuery({
    queryKey: queryKeys.templateVariables.all,
    queryFn: templateVariablesService.list,
    staleTime: 5 * 60 * 1000,
    enabled: !variables,
  });
  const list = variables ?? variablesQ.data ?? null;

  function insertVariable(key: string) {
    const token = `{{${key}}}`;
    const textarea = ref.current;
    if (!textarea) {
      onChange(value + token);
      return;
    }
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + token.length;
      textarea.setSelectionRange(caret, caret);
    });
  }

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        ref={ref}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <p className="mt-1 text-2xs text-muted-foreground">{hint}</p>

      {list ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {list.map((variable) => (
            <Tooltip key={variable.key} content={variable.description}>
              <button
                type="button"
                onClick={() => insertVariable(variable.key)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 font-mono text-2xs text-muted-foreground transition',
                  'hover:border-primary hover:bg-primary-soft hover:text-primary',
                )}
              >
                {`{{${variable.key}}}`}
              </button>
            </Tooltip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
