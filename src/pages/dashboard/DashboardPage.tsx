import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  MessagesSquare,
  Receipt,
  Timer,
  Users,
  Bot as BotIcon,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { dashboardService } from '@/services/dashboardService';
import { botService } from '@/services/botService';
import { queryKeys } from '@/lib/queryClient';
import { ROUTES } from '@/constants/app';
import { formatRelativeTime } from '@/lib/utils';
import { StatCard } from './components/StatCard';
import { ConversationsChart } from './components/ConversationsChart';
import { BotStatusCard } from './components/BotStatusCard';
import { useAuth } from '@/hooks/useAuth';

export function DashboardPage() {
  const { user } = useAuth();
  const stats = useQuery({ queryKey: queryKeys.dashboard.stats, queryFn: dashboardService.getStats });
  const bots = useQuery({ queryKey: queryKeys.bots.all, queryFn: botService.list });

  const primaryBot = bots.data?.[0];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="A real-time look at how your WhatsApp bots are performing today."
        actions={
          <>
            <Link to={ROUTES.flows}>
              <Button variant="outline" size="md">
                Open flow builder
              </Button>
            </Link>
            <Link to={ROUTES.bots}>
              <Button size="md" leftIcon={<Plus />}>
                New bot
              </Button>
            </Link>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.isLoading || !stats.data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Total conversations"
              value={stats.data.totalConversations.toLocaleString()}
              delta={stats.data.conversationsDelta}
              icon={<MessagesSquare />}
              iconTone="primary"
            />
            <StatCard
              label="Active chats"
              value={stats.data.activeChats}
              hint="Across all bot instances"
              icon={<Users />}
              iconTone="info"
            />
            <StatCard
              label="Orders today"
              value={stats.data.ordersToday}
              delta={stats.data.ordersTodayDelta}
              icon={<Receipt />}
              iconTone="success"
            />
            <StatCard
              label="Avg. response"
              value={`${stats.data.averageResponseSeconds}s`}
              hint="Last 24 hours"
              icon={<Timer />}
              iconTone="warning"
            />
          </>
        )}
      </div>

      {/* Chart + Status grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Conversations · last 14 days</CardTitle>
                <CardDescription>Daily WhatsApp inbound across all instances.</CardDescription>
              </div>
              <Link
                to={ROUTES.conversations}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-4"
              >
                View all
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.isLoading || !stats.data ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <div className="h-[220px] w-full">
                <ConversationsChart data={stats.data.conversationsByDay} />
              </div>
            )}
          </CardContent>
        </Card>

        {bots.isLoading || !primaryBot ? (
          <Skeleton className="h-72 rounded-xl lg:col-span-1" />
        ) : (
          <BotStatusCard bot={primaryBot} />
        )}
      </div>

      {/* Bottom row: Bots overview + Recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Your bots</CardTitle>
                <CardDescription>
                  Monitor every instance — add a new one or jump in to fix a disconnection.
                </CardDescription>
              </div>
              <Link to={ROUTES.bots}>
                <Button variant="ghost" size="sm">Manage</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {bots.isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))
              : bots.data?.map((bot) => (
                  <div
                    key={bot.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <BotIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold tracking-tight">{bot.name}</p>
                      <p className="truncate text-2xs text-muted-foreground font-mono">
                        {bot.phoneNumber ?? bot.id}
                      </p>
                    </div>
                    <div className="hidden text-right text-2xs text-muted-foreground sm:block">
                      {bot.metrics.conversations.toLocaleString()} conv. ·{' '}
                      {bot.metrics.activeChats} active
                    </div>
                    <div className="ml-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-current text-success" />
                    </div>
                  </div>
                ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Live event feed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))
              : stats.data?.recentActivity.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground text-pretty">{event.message}</p>
                      <p className="text-2xs text-muted-foreground">
                        {formatRelativeTime(event.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
