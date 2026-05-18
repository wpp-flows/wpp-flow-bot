import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  MessagesSquare,
  Plus,
  Receipt,
  ShoppingBag,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { dashboardService } from '@/services/dashboardService';
import { queryKeys } from '@/lib/queryClient';
import { ROUTES } from '@/constants/app';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardOverview } from '@/types';
import { KpiCard } from './components/KpiCard';
import { OrdersBarChart } from './components/OrdersBarChart';
import { StatusBreakdown } from './components/StatusBreakdown';
import { TopItemsList } from './components/TopItemsList';
import { formatBRL } from './dashboard-helpers';

export function DashboardPage() {
  const { user } = useAuth();
  const overview = useQuery({
    queryKey: queryKeys.dashboard.overview,
    queryFn: dashboardService.overview,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Bem-vindo de volta, ${user?.name?.split(' ')[0] ?? 'visitante'}`}
        description="Visão geral dos pedidos, conversas e desempenho do seu bot."
        actions={
          <>
            <Link to={ROUTES.flows}>
              <Button variant="outline" size="md">
                Abrir construtor de fluxos
              </Button>
            </Link>
            <Link to={ROUTES.bots}>
              <Button size="md" leftIcon={<Plus />}>
                Novo bot
              </Button>
            </Link>
          </>
        }
      />

      {overview.isLoading || !overview.data ? (
        <DashboardSkeleton />
      ) : (
        <DashboardContent data={overview.data} />
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </>
  );
}

function DashboardContent({ data }: { data: DashboardOverview }) {
  const weekRevenue = Number.parseFloat(data.weekRevenue);
  const prevRevenue = Number.parseFloat(data.prevWeekRevenue);
  const weekDelta =
    prevRevenue > 0 ? ((weekRevenue - prevRevenue) / prevRevenue) * 100 : null;

  const hasOrders = data.ordersByDay.some((d) => d.orders > 0);
  const hasStatusData = data.statusBreakdown.some((b) => b.count > 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<ShoppingBag />}
          tone="primary"
          label="Pedidos hoje"
          value={data.todayOrders.toLocaleString('pt-BR')}
          hint={formatBRL(data.todayRevenue)}
        />
        <KpiCard
          icon={<TrendingUp />}
          tone="success"
          label="Receita 7 dias"
          value={formatBRL(data.weekRevenue)}
          delta={weekDelta}
          hint={
            prevRevenue > 0
              ? `vs ${formatBRL(data.prevWeekRevenue)} na semana anterior`
              : 'sem comparativo da semana anterior'
          }
        />
        <KpiCard
          icon={<MessagesSquare />}
          tone="info"
          label="Conversas ativas"
          value={data.activeConversations.toLocaleString('pt-BR')}
          hint={`${data.onlineBots} de ${data.totalBots} bots online`}
        />
        <KpiCard
          icon={<UserPlus />}
          tone="warning"
          label="Novos clientes no mês"
          value={data.newCustomersThisMonth.toLocaleString('pt-BR')}
          hint="Clientes únicos cadastrados"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Pedidos · últimos 14 dias</CardTitle>
                <CardDescription>
                  Quantidade de pedidos confirmados por dia.
                </CardDescription>
              </div>
              <Link
                to={ROUTES.orders}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver todos
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {hasOrders ? (
              <OrdersBarChart data={data.ordersByDay} />
            ) : (
              <EmptyState
                icon={<Receipt />}
                title="Sem pedidos por aqui ainda"
                description="Quando seus clientes começarem a confirmar pelo bot, eles aparecem neste gráfico."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status dos pedidos · 7 dias</CardTitle>
            <CardDescription>Distribuição atual por fase.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasStatusData ? (
              <StatusBreakdown data={data.statusBreakdown} />
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nenhum pedido nos últimos 7 dias.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Itens mais pedidos · 7 dias</CardTitle>
              <CardDescription>
                Top 5 itens por quantidade vendida na última semana.
              </CardDescription>
            </div>
            <Link
              to={ROUTES.menu}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Ver menu
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <TopItemsList items={data.topItems} />
        </CardContent>
      </Card>
    </>
  );
}
