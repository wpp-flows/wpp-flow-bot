import { Badge } from '@/components/ui/Badge';
import type { BotStatus } from '@/types';

const TONE_BY_STATUS: Record<BotStatus, 'success' | 'warning' | 'destructive' | 'neutral'> = {
  online: 'success',
  connecting: 'warning',
  offline: 'neutral',
  error: 'destructive',
};

const LABEL: Record<BotStatus, string> = {
  online: 'Online',
  connecting: 'Connecting',
  offline: 'Offline',
  error: 'Error',
};

export function StatusBadge({ status, size = 'md' }: { status: BotStatus; size?: 'sm' | 'md' }) {
  return (
    <Badge tone={TONE_BY_STATUS[status]} size={size} dot>
      {LABEL[status]}
    </Badge>
  );
}
