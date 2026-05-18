import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Renders a single secret-style credential input that never echoes the saved
 * value to the DOM. When the org already has a value stored we show a masked
 * hint plus a "Remover" action; typing into the input substitutes the value.
 */
interface Props {
  label: string;
  id: string;
  value: string;
  setValue: (v: string) => void;
  hasSaved: boolean;
  savedHint?: string;
  onClear: () => void;
  clearing: boolean;
  placeholder?: string;
  hint?: string;
}

export function CredentialField(props: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={props.id}
          className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {props.label}
        </label>
        {props.hasSaved ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={props.onClear}
            loading={props.clearing}
            className="text-destructive"
          >
            Remover
          </Button>
        ) : null}
      </div>
      <Input
        id={props.id}
        value={props.value}
        onChange={(e) => props.setValue(e.target.value)}
        placeholder={
          props.hasSaved && props.savedHint
            ? `Atual: ${props.savedHint} — digite para substituir`
            : props.placeholder
        }
      />
      {props.hint ? (
        <p className="text-2xs text-muted-foreground">{props.hint}</p>
      ) : null}
    </div>
  );
}
