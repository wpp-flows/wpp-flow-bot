import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, BotOff, CheckCircle2, Send, XCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { chatService } from "@/services/chatService";
import {
  isChatConversationListQuery,
  invalidateQueriesByFilters,
  queryKeys,
} from "@/lib/queryClient";
import { toast } from "@/stores/uiStore";
import { formatDateTime } from "@/lib/utils";
import type { BotStatus, Conversation } from "@/types";
import { MessageBubble } from "./MessageBubble";

const STATUS_TONE: Record<
  Conversation["status"],
  "success" | "neutral" | "warning"
> = {
  OPEN: "success",
  CLOSED: "neutral",
  PENDING: "warning",
};

const STATUS_LABEL: Record<Conversation["status"], string> = {
  OPEN: "aberta",
  CLOSED: "fechada",
  PENDING: "pendente",
};

export function ChatPanel({
  conversation,
  botName,
  botStatus,
  botIsActive = true,
}: Readonly<{
  conversation: Conversation;
  botName?: string;
  botStatus?: BotStatus;
  botIsActive?: boolean;
}>) {
  const botBadge: { tone: "success" | "warning" | "destructive"; label: string } =
    !botIsActive
      ? { tone: "warning", label: "Bot pausado globalmente" }
      : !conversation.botActive
        ? { tone: "warning", label: "bot pausado" }
        : botStatus === "OFFLINE" || botStatus === "ERROR"
          ? { tone: "destructive", label: "bot offline" }
          : botStatus === "CONNECTING"
            ? { tone: "warning", label: "bot conectando" }
            : { tone: "success", label: "bot ativo" };
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const {
    data: messages,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: queryKeys.chats.messages(conversation.id),
    queryFn: () => chatService.listMessages(conversation.id),
    gcTime: 1 * 60 * 1000,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages?.length, conversation.id]);

  const send = useMutation({
    mutationFn: (content: string) =>
      chatService.sendMessage(conversation.id, content),
    onSuccess: () => {
      refetch();
      void invalidateQueriesByFilters(qc, [
        { predicate: isChatConversationListQuery },
      ]);
      setDraft("");
    },
    onError: (err) => {
      const apiErr = err as {
        details?: {
          response?: { message?: Array<{ exists?: boolean; jid?: string }> };
        };
        message?: string;
      };
      const detail = apiErr.details?.response?.message?.[0];
      if (detail?.exists === false) {
        toast.error(
          "Destinatario nao esta no WhatsApp",
          `O numero ${detail.jid ?? ""} nao tem uma conta no WhatsApp.`,
        );
      } else {
        toast.error("Falha ao enviar mensagem", apiErr.message);
      }
    },
  });

  const updateStatus = useMutation({
    mutationFn: (next: Conversation["status"]) =>
      chatService.updateStatus(conversation.id, next),
    onSuccess: () => {
      void invalidateQueriesByFilters(qc, [
        { predicate: isChatConversationListQuery },
      ]);
      toast.info(`Conversa marcada como ${updateStatus.variables}`);
    },
  });

  const toggleBot = useMutation({
    mutationFn: (next: boolean) =>
      chatService.setBotActive(conversation.id, next),
    onSuccess: (_, next) => {
      void invalidateQueriesByFilters(qc, [
        { predicate: isChatConversationListQuery },
      ]);
      void invalidateQueriesByFilters(qc, [
        { queryKey: queryKeys.chats.detail(conversation.id) },
      ]);
      toast.info(next ? "Bot retomado" : "Bot pausado — voce tem controle.");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    send.mutate(text);
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <header className="flex w-full shrink-0 items-center gap-3 border-b border-border bg-card/40 px-5 py-3">
        <Avatar name={conversation.contactName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold tracking-tight">
              {conversation.contactName}
            </p>
            <Badge tone={STATUS_TONE[conversation.status]} size="sm" dot>
              {STATUS_LABEL[conversation.status]}
            </Badge>
            <Badge tone={botBadge.tone} size="sm" dot>
              {botBadge.label}
            </Badge>
          </div>
          <p className="truncate text-2xs text-muted-foreground font-mono">
            {conversation.contactPhone} · {botName ? `via ${botName} · ` : ""}
            iniciada {formatDateTime(conversation.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={conversation.botActive ? "outline" : "primary"}
            leftIcon={conversation.botActive ? <BotOff /> : <Bot />}
            onClick={() => toggleBot.mutate(!conversation.botActive)}
            loading={toggleBot.isPending}
          >
            {conversation.botActive ? "Pausar bot" : "Retomar bot"}
          </Button>
          {conversation.status !== "CLOSED" ? (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<CheckCircle2 />}
              onClick={() => updateStatus.mutate("CLOSED")}
              loading={updateStatus.isPending}
            >
              Encerrar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<XCircle />}
              onClick={() => updateStatus.mutate("OPEN")}
              loading={updateStatus.isPending}
            >
              Reabrir
            </Button>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 w-full flex-1 space-y-3 overflow-y-auto bg-muted/30 px-5 py-6 scrollbar-thin"
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-12 ${i % 2 ? "ml-auto w-[55%]" : "w-[45%]"}`}
            />
          ))
          : messages?.map((m) => <MessageBubble key={m.id} message={m} />)}
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full shrink-0 border-t border-border bg-background p-3"
      >
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            placeholder={`Responder para ${conversation.contactName.split(" ")[0]}...`}
            className="resize-none"
          />
          <Button
            type="submit"
            rightIcon={<Send />}
            disabled={!draft.trim() || send.isPending}
          >
            Enviar
          </Button>
        </div>
        <p className="mt-1.5 text-2xs text-muted-foreground">
          Pressione{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-2xs">
            Enter
          </kbd>{" "}
          para enviar,{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-2xs">
            Shift + Enter
          </kbd>{" "}
          para uma nova linha.
        </p>
      </form>
    </div>
  );
}
