import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KPICard } from '@/components/milespro';
import { Users, Plane, Building2, Car, TrendingUp, Calendar, ArrowRight, Loader2, Plus } from 'lucide-react';
import { useTravelClients, useTravelTickets, useTravelHotelReservations, useTravelCarRentals, useTravelAgencyStats } from '@/hooks/travel';
import { useLocalization } from '@/hooks/useLocalization';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function AgenciaDashboard() {
  const { formatCurrency, formatNumber, formatDate } = useLocalization();
  const navigate = useNavigate();
  
  const { data: stats, isLoading: statsLoading } = useTravelAgencyStats();
  const { data: clients = [] } = useTravelClients();
  const { data: tickets = [] } = useTravelTickets();
  const { data: hotels = [] } = useTravelHotelReservations();
  const { data: cars = [] } = useTravelCarRentals();

  // Pending reservations
  const pendingTickets = tickets.filter(t => t.status === 'pending');
  const pendingHotels = hotels.filter(h => h.status === 'pending');
  const pendingCars = cars.filter(c => c.status === 'pending');
  const totalPending = pendingTickets.length + pendingHotels.length + pendingCars.length;

  // Revenue by category
  const ticketsRevenue = tickets.reduce((sum, t) => sum + t.total_cost_brl, 0);
  const hotelsRevenue = hotels.reduce((sum, h) => sum + h.total_cost_brl, 0);
  const carsRevenue = cars.reduce((sum, c) => sum + c.total_cost_brl, 0);

  const revenueData = [
    { name: 'Passagens', value: ticketsRevenue, color: 'hsl(var(--primary))' },
    { name: 'Hotéis', value: hotelsRevenue, color: 'hsl(var(--chart-2))' },
    { name: 'Carros', value: carsRevenue, color: 'hsl(var(--chart-3))' },
  ];

  // Recent activity - combine and sort by date
  const recentActivity = [
    ...tickets.slice(0, 3).map(t => ({ type: 'ticket' as const, date: t.created_at, item: t })),
    ...hotels.slice(0, 3).map(h => ({ type: 'hotel' as const, date: h.created_at, item: h })),
    ...cars.slice(0, 3).map(c => ({ type: 'car' as const, date: c.created_at, item: c })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  // Top clients by spending
  const topClients = [...clients]
    .sort((a, b) => b.total_spent_brl - a.total_spent_brl)
    .slice(0, 5);

  // Operations by month for chart
  const monthlyData = (() => {
    const months: { [key: string]: { tickets: number; hotels: number; cars: number } } = {};
    
    const addToMonth = (date: string, type: 'tickets' | 'hotels' | 'cars') => {
      const monthKey = date.substring(0, 7);
      if (!months[monthKey]) months[monthKey] = { tickets: 0, hotels: 0, cars: 0 };
      months[monthKey][type]++;
    };

    tickets.forEach(t => addToMonth(t.flight_date, 'tickets'));
    hotels.forEach(h => addToMonth(h.check_in, 'hotels'));
    cars.forEach(c => addToMonth(c.pickup_date, 'cars'));

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
        ...data,
      }));
  })();

  if (statsLoading) {
    return (
      <DashboardLayout title="Agência de Viagem">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Agência de Viagem">
      <div className="space-y-4">
        <PageHeader
          eyebrow="Agência"
          icon={<Plane className="h-5 w-5" />}
          title="Painel da Agência"
          subtitle="Visão geral de clientes, reservas e receita"
        />
        {/* Main KPIs — milespro KPICard size='sm' */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            size="sm"
            label="Total Clientes"
            value={stats?.totalClients || 0}
            icon={<Users className="h-5 w-5 text-primary" />}
            caption={
              <>
                <span className="font-mono tabular-nums">{formatNumber(stats?.totalMilesAvailable || 0)}</span> milhas disponíveis
              </>
            }
          />
          <KPICard
            size="sm"
            accent="success"
            label="Receita Total"
            value={formatCurrency(stats?.totalRevenue || 0)}
            icon={<TrendingUp className="h-5 w-5" />}
            caption={
              <>
                <span className="font-mono tabular-nums">{formatNumber(stats?.totalMilesUsed || 0)}</span> milhas utilizadas
              </>
            }
          />
          <KPICard
            size="sm"
            label="Pendentes"
            value={totalPending}
            icon={<Calendar className="h-5 w-5 text-primary" />}
            caption="reservas aguardando confirmação"
          />
          <KPICard
            size="sm"
            accent="info"
            label="Total Operações"
            value={(stats?.ticketsCount || 0) + (stats?.hotelsCount || 0) + (stats?.carsCount || 0)}
            icon={<Plane className="h-5 w-5" />}
            caption={
              <>
                <span className="font-mono tabular-nums">{stats?.ticketsCount || 0}</span> voos •{' '}
                <span className="font-mono tabular-nums">{stats?.hotelsCount || 0}</span> hotéis •{' '}
                <span className="font-mono tabular-nums">{stats?.carsCount || 0}</span> carros
              </>
            }
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/agencia/clientes')}>
            <Users className="h-5 w-5" />
            <span className="text-xs">Novo Cliente</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/agencia/passagens')}>
            <Plane className="h-5 w-5" />
            <span className="text-xs">Emitir Passagem</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/agencia/hoteis')}>
            <Building2 className="h-5 w-5" />
            <span className="text-xs">Reservar Hotel</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/agencia/carros')}>
            <Car className="h-5 w-5" />
            <span className="text-xs">Alugar Carro</span>
          </Button>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue by Category */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.some(d => d.value > 0) ? (
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueData.filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={50}
                          dataKey="value"
                        >
                          {revenueData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {revenueData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="font-mono text-sm font-medium tabular-nums">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  Nenhuma receita registrada
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Operations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Operações por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="tickets" name="Passagens" fill="hsl(var(--primary))" stackId="a" />
                      <Bar dataKey="hotels" name="Hotéis" fill="hsl(var(--chart-2))" stackId="a" />
                      <Bar dataKey="cars" name="Carros" fill="hsl(var(--chart-3))" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                  Nenhuma operação registrada
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pending Reservations */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Reservas Pendentes</CardTitle>
                <Badge variant="secondary">{totalPending}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {totalPending === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  Nenhuma reserva pendente
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{ticket.client?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ticket.origin} → {ticket.destination} • {formatDate(ticket.flight_date)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Pendente</Badge>
                    </div>
                  ))}
                  {pendingHotels.map((hotel) => (
                    <div key={hotel.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-info" />
                        <div>
                          <p className="text-sm font-medium">{hotel.client?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {hotel.hotel_name} • {formatDate(hotel.check_in)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Pendente</Badge>
                    </div>
                  ))}
                  {pendingCars.map((car) => (
                    <div key={car.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{car.client?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {car.rental_company} • {formatDate(car.pickup_date)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Pendente</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Top Clientes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/agencia/clientes')}>
                  Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {topClients.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  Nenhum cliente cadastrado
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Milhas</TableHead>
                        <TableHead className="text-right">Gasto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{formatNumber(client.miles_balance)}</TableCell>
                          <TableCell className="text-right font-mono font-medium tabular-nums text-primary">
                            {formatCurrency(client.total_spent_brl)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
