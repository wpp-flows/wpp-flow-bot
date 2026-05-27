import { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxHeight = '90vh',
}: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-foreground/40',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />
        <Dialog.Content
          aria-describedby={description ? 'bs-desc' : undefined}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-border bg-card text-card-foreground shadow-soft-lg',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
          )}
          style={{ maxHeight }}
        >
          <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />

          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Fechar"
              className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>

          {title || description ? (
            <div className="shrink-0 flex flex-col gap-0.5 px-5 pt-3 pb-3 pr-12">
              {title ? (
                <Dialog.Title className="text-base font-semibold tracking-tight">
                  {title}
                </Dialog.Title>
              ) : null}
              {description ? (
                <Dialog.Description
                  id="bs-desc"
                  className="text-sm text-muted-foreground"
                >
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
          ) : (
            <Dialog.Title className="sr-only">Detalhes</Dialog.Title>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-5 pb-5">
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 border-t border-border bg-card/95 px-5 py-3 pb-[max(theme(spacing.3),env(safe-area-inset-bottom))] backdrop-blur">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
