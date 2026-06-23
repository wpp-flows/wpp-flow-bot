import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Info, MessageCircle, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { botService } from "@/services/botService";
import { chatService } from "@/services/chatService";
import {
  invalidateQueriesByFilters,
  isChatConversationListQuery,
  queryKeys,
} from "@/lib/queryClient";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import type { BotInstance, Conversation, ConversationStatus } from "@/types";
import { ConversationList } from "./components/ConversationList";
import { ChatPanel } from "./components/ChatPanel";

type StatusFilter = ConversationStatus | "all";

export function ConversationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const debouncedSearch = useDebouncedValue(search, 200);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [debouncedSearch, statusFilter],
  );

  const conversations = useQuery({
    queryKey: [...queryKeys.chats.all, filters],
    queryFn: () => chatService.list(filters),
    staleTime: 0.5 * 1000 * 60,
    gcTime: 1 * 1000 * 60,
  });

  const messagesForSelection = useQuery({
    queryKey:
      selectedId === null
        ? ["chats", "messages", "__none"]
        : queryKeys.chats.messages(selectedId),
    queryFn: () => chatService.listMessages(selectedId!),
    enabled: selectedId !== null,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (selectedId === null) return;
    if (!messagesForSelection.isSuccess || messagesForSelection.isFetching)
      return;
    void invalidateQueriesByFilters(queryClient, [
      { predicate: isChatConversationListQuery },
    ]);
  }, [
    selectedId,
    messagesForSelection.isSuccess,
    messagesForSelection.isFetching,
    messagesForSelection.dataUpdatedAt,
    queryClient,
  ]);

  const bots = useQuery({
    queryKey: queryKeys.bots.all,
    queryFn: botService.list,
    staleTime: 5 * 60_000,
  });

  const botNamesById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const b of bots.data ?? []) map[b.id] = b.name;
    return map;
  }, [bots.data]);

  const botStatusById = useMemo(() => {
    const map: Record<string, BotInstance['status']> = {};
    for (const b of bots.data ?? []) map[b.id] = b.status;
    return map;
  }, [bots.data]);

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

  const onSelectConversation = useCallback(
    (id: string) => {
      setSelectedId(id);
      setMobileView("chat");
      queryClient.setQueriesData<Conversation[]>(
        { queryKey: queryKeys.chats.all, exact: false },
        (old) => old?.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
      );
      void chatService
        .markConversationRead(id)
        .then(() =>
          invalidateQueriesByFilters(queryClient, [
            { predicate: isChatConversationListQuery },
          ]),
        );
    },
    [queryClient],
  );

  const selected = conversations.data?.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conversas"
        description="Todos os atendimentos do WhatsApp que o seu bot está gerenciando. Assuma o controle, encerre ou revise um fluxo."
      />

      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        As conversas e mensagens são atualizadas em tempo real.
      </div>

      <Card className="flex h-[calc(100vh-270px)] min-h-[560px] w-full min-w-0 overflow-hidden p-0">
        <div
          className={cn(
            "w-full flex-col border-r border-border lg:flex lg:max-w-sm lg:shrink-0",
            mobileView === "list" ? "flex" : "hidden lg:flex",
          )}
        >
          <div className="space-y-3 border-b border-border bg-card/40 p-3">
            <Input
              placeholder="Buscar conversas…"
              leftIcon={<Search />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Tabs
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                items={[
                  { value: "all", label: "Todas" },
                  { value: "OPEN", label: "Abertas" },
                  { value: "PENDING", label: "Pendentes" },
                  { value: "CLOSED", label: "Fechadas" },
                ]}
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <ConversationList
              conversations={conversations.data ?? []}
              isLoading={conversations.isLoading}
              selectedId={selectedId}
              onSelect={onSelectConversation}
              botNamesById={botNamesById}
            />
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 lg:flex lg:flex-col",
            mobileView === "chat" ? "flex flex-col" : "hidden lg:flex",
          )}
        >
          {selected ? (
            <>
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className="flex items-center gap-1.5 border-b border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground lg:hidden"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para conversas
              </button>
              <ChatPanel
                conversation={selected}
                botName={botNamesById[selected.botId]}
                botStatus={botStatusById[selected.botId]}
                key={selected.id}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon={<MessageCircle />}
                title="Selecione uma conversa"
                description="Escolha um contato na lista para ver o histórico completo de mensagens."
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
