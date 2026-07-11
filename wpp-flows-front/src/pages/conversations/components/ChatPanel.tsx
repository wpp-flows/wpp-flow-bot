import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, BotOff, CheckCircle2, Clock, Send, XCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
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

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

function isWindowExpired(conversation: Conversation): boolean {
  if (!conversation.lastInboundAt) return false;
  return Date.now() - new Date(conversation.lastInboundAt).getTime() >= SERVICE_WINDOW_MS;
}

interface GraphSendError {
  details?: { error?: { message?: string; code?: number } };
  message?: string;
}

function describeGraphError(err: GraphSendError): { title: string; body?: string } {
  const graph = err.details?.error;
  switch (graph?.code) {
    case 131047: // re-engagement — fora da janela de 24h
      return {
        title: "Janela de 24h fechada",
        body: "O cliente precisa mandar uma mensagem para você poder responder com texto livre.",
      };
    case 131026: // undeliverable (sem WhatsApp / bloqueou)
      return {
        title: "Mensagem não entregue",
        body: "Este número pode não ter WhatsApp ou ter bloqueado o contato.",
      };
    case 131056: // pair rate limit
      return {
        title: "Muitas mensagens para este contato",
        body: "Aguarde alguns instantes antes de tentar de novo.",
      };
    default:
      return {
        title: "Falha ao enviar mensagem",
        body: graph?.message ?? err.message,
      };
  }
}

function botBadgeFor(
  conversation: Conversation,
  botStatus: BotStatus | undefined,
  botIsActive: boolean,
): { tone: "success" | "warning" | "destructive"; label: string } {
  if (!botIsActive) return { tone: "warning", label: "Bot pausado globalmente" };
  if (!conversation.botActive) return { tone: "warning", label: "bot pausado" };
  if (botStatus === "OFFLINE" || botStatus === "ERROR") {
    return { tone: "destructive", label: "bot offline" };
  }
  if (botStatus === "CONNECTING") return { tone: "warning", label: "bot conectando" };
  return { tone: "success", label: "bot ativo" };
}

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
  const botBadge = botBadgeFor(conversation, botStatus, botIsActive);
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
      const { title, body } = describeGraphError(err as GraphSendError);
      toast.error(title, body);
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

      {isWindowExpired(conversation) ? (
        <div className="w-full shrink-0 border-t border-border bg-background px-3 pt-3">
          <Alert variant="warning">
            <Clock />
            <AlertTitle>Janela de 24h fechada</AlertTitle>
            <AlertDescription>
              A última mensagem do cliente foi há mais de 24 horas. Pela regra
              da Meta, respostas de texto livre podem ser rejeitadas até o
              cliente escrever de novo.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

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
