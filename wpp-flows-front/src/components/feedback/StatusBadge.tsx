import { Badge } from '@/components/ui/Badge';
import type { BotStatus } from '@/types';

const TONE_BY_STATUS: Record<BotStatus, 'success' | 'warning' | 'destructive' | 'neutral'> = {
  ONLINE: 'success',
  CONNECTING: 'warning',
  OFFLINE: 'neutral',
  ERROR: 'destructive',
};

const LABEL: Record<BotStatus, string> = {
  ONLINE: 'Online',
  CONNECTING: 'Connecting',
  OFFLINE: 'Offline',
  ERROR: 'Error',
};

export function StatusBadge({ status, size = 'md' }: Readonly<{ status: BotStatus; size?: 'sm' | 'md' }>) {
  return (
    <Badge tone={TONE_BY_STATUS[status]} size={size} dot>
      {LABEL[status]}
    </Badge>
  );
}
