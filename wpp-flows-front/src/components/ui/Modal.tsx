import { type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  closeOnOverlay?: boolean;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-5xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
}: Readonly<ModalProps>) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-foreground/40',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
          <DialogPrimitive.Content
            onPointerDownOutside={(e) => {
              if (!closeOnOverlay) e.preventDefault();
            }}
            onInteractOutside={(e) => {
              if (!closeOnOverlay) e.preventDefault();
            }}
            className={cn(
              'pointer-events-auto relative flex w-full max-h-[95vh] sm:max-h-[90vh] flex-col rounded-xl border border-border bg-card text-card-foreground shadow-soft-lg',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              SIZES[size],
            )}
          >
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </DialogPrimitive.Close>

            {title || description ? (
              <div className="shrink-0 flex flex-col gap-0.5 px-4 pt-4 pb-3 pr-12 sm:px-6 sm:pt-5">
                {title ? (
                  <DialogPrimitive.Title className="text-base font-semibold tracking-tight">
                    {title}
                  </DialogPrimitive.Title>
                ) : null}
                {description ? (
                  <DialogPrimitive.Description className="text-sm text-muted-foreground">
                    {description}
                  </DialogPrimitive.Description>
                ) : null}
              </div>
            ) : (
              <DialogPrimitive.Title className="sr-only">Janela</DialogPrimitive.Title>
            )}

            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6',
                title || description ? 'pb-5' : 'pt-10 pb-5',
              )}
            >
              {children}
            </div>

            {footer ? (
              <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-6 sm:py-4">
                {footer}
              </div>
            ) : null}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
