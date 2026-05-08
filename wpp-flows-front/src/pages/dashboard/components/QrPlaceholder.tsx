import { cn } from '@/lib/utils';

/**
 * Decorative QR placeholder — deterministic 25×25 grid generated from the seed
 * so the same instance always renders the same pattern.
 */
export function QrPlaceholder({ seed = 'mesa', className }: { seed?: string; className?: string }) {
  const size = 25;
  const cells: boolean[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < size * size; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push((h & 0xff) > 110);
  }

  // finder corners (top-left, top-right, bottom-left)
  const setFinder = (cx: number, cy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isOuter = x === 0 || x === 6 || y === 0 || y === 6;
        const isInner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        cells[(cy + y) * size + (cx + x)] = isOuter || isInner;
        if (!isOuter && !isInner) cells[(cy + y) * size + (cx + x)] = false;
      }
    }
  };
  setFinder(0, 0);
  setFinder(size - 7, 0);
  setFinder(0, size - 7);

  return (
    <div
      className={cn(
        'relative grid aspect-square w-full overflow-hidden rounded-lg bg-card p-3 ring-1 ring-border',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gap: 1 }}
      aria-hidden
    >
      {cells.map((on, i) => (
        <span
          key={i}
          className={cn(
            'aspect-square rounded-[1px]',
            on ? 'bg-foreground' : 'bg-transparent',
          )}
        />
      ))}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-md bg-background px-2 py-0.5 text-2xs font-semibold tracking-wider uppercase text-muted-foreground ring-1 ring-border">
          Escaneie para conectar
        </span>
      </span>
    </div>
  );
}
