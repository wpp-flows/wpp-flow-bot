import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bell,
  Check,
  CheckCheck,
  Copy,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Smartphone,
  X,
} from "lucide-react";
import { invitationService } from "@/services/invitationService";
import {
  adminNotificationService,
  type AdminNotification,
} from "@/services/adminNotificationService";
import { toast } from "@/stores/uiStore";
import { ApiError } from "@/instances/api";
import { cn } from "@/lib/utils";
import type { Invitation } from "@/types";

const queryKey = ["admin", "invitations"] as const;
const notificationsKey = ["admin", "notifications"] as const;

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe o e-mail.")
    .email("E-mail inválido."),
});
type InviteFormValues = z.infer<typeof inviteSchema>;

export function InvitationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    Invitation["status"] | "ALL"
  >("ALL");

  const invitesQ = useQuery({
    queryKey,
    queryFn: () => invitationService.listAdmin(),
  });

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  });

  const createInvite = useMutation({
    mutationFn: (values: InviteFormValues) =>
      invitationService.createAdmin(values.email),
    onSuccess: (invite) => {
      toast.success("Convite enviado", `Enviamos o link para ${invite.email}.`);
      form.reset({ email: "" });
      void qc.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.message : "Falha ao enviar convite.";
      toast.error("Falha ao convidar", msg);
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) => invitationService.revokeAdmin(id),
    onSuccess: () => {
      toast.success("Convite revogado");
      void qc.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Falha ao revogar");
    },
  });

  const invites = invitesQ.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invites.filter((inv) => {
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
      if (!q) return true;
      return inv.email.toLowerCase().includes(q);
    });
  }, [invites, search, statusFilter]);

  const counts = useMemo(() => {
    const acc = {
      ALL: invites.length,
      PENDING: 0,
      ACCEPTED: 0,
      REVOKED: 0,
      EXPIRED: 0,
    };
    for (const inv of invites) acc[inv.status] += 1;
    return acc;
  }, [invites]);

  const onSubmit = (values: InviteFormValues) => createInvite.mutate(values);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Painel admin</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Convites de novos operadores e notificações de plataforma. Cada link
          de convite é de uso único e expira em 7 dias.
        </p>
      </header>

      <AdminNotificationsSection />

      {/* Invite form */}
      <section className="rounded-xl border border-zinc-200 p-5">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
          noValidate
        >
          <div className="flex-1">
            <label
              htmlFor="invite-email"
              className="block text-sm font-medium text-zinc-900"
            >
              Enviar convite por e-mail
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-md border border-zinc-300 px-3 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900">
              <Mail className="h-4 w-4 text-zinc-400" />
              <input
                id="invite-email"
                type="email"
                placeholder="ana@restaurante.com"
                autoComplete="email"
                className="h-10 w-full bg-transparent text-sm placeholder:text-zinc-400 focus:outline-none"
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email ? (
              <p className="mt-1.5 text-xs text-rose-600">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={createInvite.isPending}
            className="inline-flex h-10 items-center justify-center gap-1.5 self-end rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {createInvite.isPending ? "Enviando…" : "Enviar convite"}
          </button>
        </form>
      </section>

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              label="Todos"
              count={counts.ALL}
              active={statusFilter === "ALL"}
              onClick={() => setStatusFilter("ALL")}
            />
            <FilterChip
              label="Pendentes"
              count={counts.PENDING}
              active={statusFilter === "PENDING"}
              onClick={() => setStatusFilter("PENDING")}
            />
            <FilterChip
              label="Aceitos"
              count={counts.ACCEPTED}
              active={statusFilter === "ACCEPTED"}
              onClick={() => setStatusFilter("ACCEPTED")}
            />
            <FilterChip
              label="Revogados"
              count={counts.REVOKED}
              active={statusFilter === "REVOKED"}
              onClick={() => setStatusFilter("REVOKED")}
            />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 sm:w-72">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              type="search"
              placeholder="Buscar por e-mail…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full bg-transparent text-sm placeholder:text-zinc-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/60">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-600">
                  E-mail
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-600">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-600">
                  Convidado por
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-600">
                  Expira
                </th>
                <th className="w-px px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {invitesQ.isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-zinc-500"
                  >
                    Carregando…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-zinc-500"
                  >
                    {invites.length === 0
                      ? "Nenhum convite enviado ainda. Envie o primeiro acima."
                      : "Nenhum convite corresponde ao filtro."}
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <InvitationRow
                    key={inv.id}
                    invitation={inv}
                    onRevoke={() => revoke.mutate(inv.id)}
                    revoking={revoke.isPending && revoke.variables === inv.id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-2xs font-medium tabular-nums",
          active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-600",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function InvitationRow({
  invitation,
  onRevoke,
  revoking,
}: {
  invitation: Invitation;
  onRevoke: () => void;
  revoking: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const expiresLabel = new Date(invitation.expiresAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sign-up?token=${encodeURIComponent(invitation.token)}`
      : `/sign-up?token=${encodeURIComponent(invitation.token)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
    setMenuOpen(false);
  };

  return (
    <tr className="border-b border-zinc-100 last:border-b-0">
      <td className="px-4 py-3 font-medium text-zinc-900">
        {invitation.email}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={invitation.status} />
      </td>
      <td className="px-4 py-3 text-zinc-600">
        {invitation.invitedByName ?? "—"}
      </td>
      <td className="px-4 py-3 text-zinc-600 tabular-nums">{expiresLabel}</td>
      <td className="px-4 py-3 text-right">
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Ações"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <div
            className={cn(
              "absolute right-0 top-full z-50 mt-1 w-48 origin-top-right rounded-lg border border-zinc-200 bg-white p-1 text-sm shadow-lg transition-all",
              menuOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <button
              type="button"
              onMouseDown={copyLink}
              className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-zinc-700 hover:bg-zinc-50"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copiar link
            </button>
            {invitation.status === "PENDING" ? (
              <button
                type="button"
                disabled={revoking}
                onMouseDown={() => {
                  onRevoke();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                {revoking ? "Revogando…" : "Revogar convite"}
              </button>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
}

function AdminNotificationsSection() {
  const qc = useQueryClient();
  const notificationsQ = useQuery({
    queryKey: notificationsKey,
    queryFn: () => adminNotificationService.list(),
    // Refetch on focus so a freshly-resolved drift shows up without a reload.
    refetchOnWindowFocus: true,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => adminNotificationService.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsKey });
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : "Falha ao marcar como lida",
      );
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => adminNotificationService.markAllRead(),
    onSuccess: (res) => {
      if (res.markedCount > 0) {
        toast.success(
          res.markedCount === 1
            ? "1 notificação marcada como lida"
            : `${res.markedCount} notificações marcadas como lidas`,
        );
      }
      void qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });

  const items = notificationsQ.data?.items ?? [];
  const unread = notificationsQ.data?.unread ?? 0;

  return (
    <section className="rounded-xl border border-zinc-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-zinc-500" />
          <h2 className="text-base font-semibold tracking-tight">
            Notificações
          </h2>
          {unread > 0 ? (
            <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-2xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
              {unread} {unread === 1 ? "nova" : "novas"}
            </span>
          ) : null}
        </div>
        {unread > 0 ? (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        {notificationsQ.isLoading ? (
          <p className="text-sm text-zinc-500">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Sem notificações por aqui. Atualizações de versão do WhatsApp Web
            aparecem aqui quando detectadas.
          </p>
        ) : (
          <ul className="-mx-2 divide-y divide-zinc-100">
            {items.map((n) => (
              <li key={n.id} className="px-2">
                <AdminNotificationItem
                  notification={n}
                  onMarkRead={() => markRead.mutate(n.id)}
                  marking={markRead.isPending && markRead.variables === n.id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function AdminNotificationItem({
  notification,
  onMarkRead,
  marking,
}: {
  notification: AdminNotification;
  onMarkRead: () => void;
  marking: boolean;
}) {
  const unread = !notification.readAt;
  const { from, to, coolifyDeploy } = parseVersionMetadata(notification);
  const createdLabel = new Date(notification.createdAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          unread ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600",
        )}
      >
        <Smartphone className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-sm font-medium text-zinc-900">
            {notification.title}
          </p>
          {unread ? (
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
          ) : null}
          <span className="text-xs text-zinc-500 tabular-nums">
            {createdLabel}
          </span>
        </div>
        {from && to ? (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700">
              {from}
            </span>
            <span className="text-zinc-400">→</span>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 ring-1 ring-inset ring-emerald-200">
              {to}
            </span>
            {coolifyDeploy ? (
              <CoolifyDeployBadge outcome={coolifyDeploy} />
            ) : null}
          </div>
        ) : null}
        <p className="mt-1 text-sm text-zinc-600">{notification.body}</p>
      </div>
      {unread ? (
        <button
          type="button"
          onClick={onMarkRead}
          disabled={marking}
          className="ml-2 inline-flex h-7 items-center justify-center rounded-md px-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
          aria-label="Marcar como lida"
          title="Marcar como lida"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function CoolifyDeployBadge({
  outcome,
}: {
  outcome: "ok" | "skipped" | "failed";
}) {
  const styles: Record<typeof outcome, string> = {
    ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    skipped: "bg-amber-50 text-amber-700 ring-amber-200",
    failed: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const labels: Record<typeof outcome, string> = {
    ok: "Coolify deploy ok",
    skipped: "Coolify não configurado",
    failed: "Coolify falhou",
  };
  return (
    <span
      className={cn(
        "ml-1 rounded px-1.5 py-0.5 text-2xs font-medium ring-1 ring-inset",
        styles[outcome],
      )}
    >
      {labels[outcome]}
    </span>
  );
}

function parseVersionMetadata(
  notification: AdminNotification,
): {
  from?: string;
  to?: string;
  coolifyDeploy?: "ok" | "skipped" | "failed";
} {
  if (notification.type !== "WA_VERSION_UPDATED") return {};
  const meta = notification.metadata ?? {};
  const from = typeof meta.from === "string" ? meta.from : undefined;
  const to = typeof meta.to === "string" ? meta.to : undefined;
  const raw = meta.coolifyDeploy;
  const coolifyDeploy =
    raw === "ok" || raw === "skipped" || raw === "failed" ? raw : undefined;
  return { from, to, coolifyDeploy };
}

function StatusBadge({ status }: { status: Invitation["status"] }) {
  const styles: Record<Invitation["status"], string> = {
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    REVOKED: "bg-zinc-100 text-zinc-600 ring-zinc-200",
    EXPIRED: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const labels: Record<Invitation["status"], string> = {
    PENDING: "Pendente",
    ACCEPTED: "Aceito",
    REVOKED: "Revogado",
    EXPIRED: "Expirado",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
