import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MessageCircle, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { chatService } from '@/services/chatService';
import { queryKeys } from '@/lib/queryClient';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ConversationStatus } from '@/types';
import { ConversationList } from './components/ConversationList';
import { ChatPanel } from './components/ChatPanel';

type StatusFilter = ConversationStatus | 'all';

export function ConversationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 200);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
    [debouncedSearch, statusFilter, fromDate, toDate],
  );

  const conversations = useQuery({
    queryKey: [...queryKeys.chats.all, filters],
    queryFn: () => chatService.list(filters),
  });

  useEffect(() => {
    if (conversations.data && !selectedId) {
      setSelectedId(conversations.data[0]?.id ?? null);
    }
    if (
      selectedId &&
      conversations.data &&
      !conversations.data.some((c) => c.id === selectedId)
    ) {
      setSelectedId(conversations.data[0]?.id ?? null);
    }
  }, [conversations.data, selectedId]);

  const selected = conversations.data?.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conversations"
        description="Every WhatsApp thread your bot is handling. Take over, close out, or audit a flow."
      />

      <Card className="flex h-[calc(100vh-220px)] min-h-[560px] overflow-hidden p-0">
        {/* Left panel — list + filters */}
        <div className="flex w-full max-w-sm shrink-0 flex-col border-r border-border">
          <div className="space-y-3 border-b border-border bg-card/40 p-3">
            <Input
              placeholder="Search conversations…"
              leftIcon={<Search />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Tabs
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                items={[
                  { value: 'all', label: 'All' },
                  { value: 'open', label: 'Open' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'closed', label: 'Closed' },
                ]}
                className="flex-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  From
                </span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  leftIcon={<Calendar />}
                />
              </label>
              <label className="space-y-1">
                <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  To
                </span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  leftIcon={<Calendar />}
                />
              </label>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <ConversationList
              conversations={conversations.data ?? []}
              isLoading={conversations.isLoading}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>

        {/* Right panel — selected conversation */}
        <div className="hidden flex-1 lg:flex">
          {selected ? (
            <ChatPanel conversation={selected} key={selected.id} />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon={<MessageCircle />}
                title="Select a conversation"
                description="Choose any thread from the list to view the full message history."
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
