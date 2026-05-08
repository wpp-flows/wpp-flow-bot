import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, BotOff, CheckCircle2, Phone, Send, XCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
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
import type { Conversation } from "@/types";
import { MessageBubble } from "./MessageBubble";

const STATUS_TONE: Record<
  Conversation["status"],
  "success" | "neutral" | "warning"
> = {
  OPEN: "success",
  CLOSED: "neutral",
  PENDING: "warning",
};

export function ChatPanel({
  conversation,
  botName,
}: Readonly<{ conversation: Conversation; botName?: string }>) {
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
          "Recipient is not on WhatsApp",
          `The number ${detail.jid ?? ""} doesn't have a WhatsApp account.`,
        );
      } else {
        toast.error("Failed to send message", apiErr.message);
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
      toast.info(`Conversation marked as ${updateStatus.variables}`);
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
      toast.info(next ? "Bot resumed" : "Bot paused — you have control.");
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
              {conversation.status.toLowerCase()}
            </Badge>
            <Badge
              tone={conversation.botActive ? "success" : "warning"}
              size="sm"
              dot
            >
              {conversation.botActive ? "bot active" : "bot paused"}
            </Badge>
          </div>
          <p className="truncate text-2xs text-muted-foreground font-mono">
            {conversation.contactPhone} · {botName ? `via ${botName} · ` : ""}
            started {formatDateTime(conversation.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content="Call contact">
            <IconButton variant="ghost" aria-label="Call">
              <Phone />
            </IconButton>
          </Tooltip>
          <Button
            size="sm"
            variant={conversation.botActive ? "outline" : "primary"}
            leftIcon={conversation.botActive ? <BotOff /> : <Bot />}
            onClick={() => toggleBot.mutate(!conversation.botActive)}
            loading={toggleBot.isPending}
          >
            {conversation.botActive ? "Stop bot" : "Resume bot"}
          </Button>
          {conversation.status !== "CLOSED" ? (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<CheckCircle2 />}
              onClick={() => updateStatus.mutate("CLOSED")}
              loading={updateStatus.isPending}
            >
              Close
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<XCircle />}
              onClick={() => updateStatus.mutate("OPEN")}
              loading={updateStatus.isPending}
            >
              Reopen
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
            placeholder={`Reply to ${conversation.contactName.split(" ")[0]}…`}
            className="resize-none"
          />
          <Button
            type="submit"
            rightIcon={<Send />}
            disabled={!draft.trim() || send.isPending}
          >
            Send
          </Button>
        </div>
        <p className="mt-1.5 text-2xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-2xs">
            Enter
          </kbd>{" "}
          to send,{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-2xs">
            Shift + Enter
          </kbd>{" "}
          for a new line.
        </p>
      </form>
    </div>
  );
}
