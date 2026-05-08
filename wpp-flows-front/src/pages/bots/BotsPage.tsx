import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot as BotIcon, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { botService } from '@/services/botService';
import { queryKeys } from '@/lib/queryClient';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { BotCard } from './components/BotCard';
import { CreateBotModal } from './components/CreateBotModal';
import type { BotStatus } from '@/types';

type StatusFilter = 'all' | BotStatus;

export function BotsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const debouncedSearch = useDebouncedValue(search, 200);

  const bots = useQuery({
    queryKey: queryKeys.bots.all,
    queryFn: botService.list,
    refetchInterval: (q) =>
      (q.state.data ?? []).some((b) => b.status === 'CONNECTING') ? 3000 : false,
  });

  const filtered = (bots.data ?? []).filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (debouncedSearch.trim()) {
      const hay = `${b.name} ${b.phoneNumber ?? ''} ${b.id}`.toLowerCase();
      if (!hay.includes(debouncedSearch.trim().toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bots"
        description="Cada bot e uma instancia do WhatsApp com Evolution API. Conecte, monitore e gerencie aqui."
        actions={
          <Button leftIcon={<Plus />} onClick={() => setCreateOpen(true)}>
            Novo bot
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-sm">
          <Input
            placeholder="Buscar por nome, telefone ou ID..."
            leftIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          items={[
            { value: 'all', label: 'Todos' },
            { value: 'ONLINE', label: 'Online' },
            { value: 'CONNECTING', label: 'Conectando' },
            { value: 'OFFLINE', label: 'Offline' },
          ]}
        />
      </div>

      {bots.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BotIcon />}
          title="Nenhum bot corresponde aos filtros"
          description={
            bots.data?.length === 0
              ? 'Crie seu primeiro bot para comecar a enviar e receber mensagens no WhatsApp.'
              : 'Tente ajustar os filtros ou o termo de busca.'
          }
          action={
            bots.data?.length === 0 ? (
              <Button leftIcon={<Plus />} onClick={() => setCreateOpen(true)}>
                Criar seu primeiro bot
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </div>
      )}

      <CreateBotModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
