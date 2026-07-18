import { useState, useMemo, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Plane, Building2, Car, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useTravelTickets, useTravelHotelReservations, useTravelCarRentals, useTravelClients } from '@/hooks/travel';
import { useLocalization } from '@/hooks/useLocalization';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  type: 'ticket' | 'hotel' | 'car';
  title: string;
  client: string;
  startDate: string;
  endDate?: string;
  status: string;
  details: string;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Calendario() {
  const { formatCurrency, formatDate } = useLocalization();
  const { data: tickets = [], isLoading: loadingTickets } = useTravelTickets();
  const { data: hotels = [], isLoading: loadingHotels } = useTravelHotelReservations();
  const { data: cars = [], isLoading: loadingCars } = useTravelCarRentals();
  const { data: clients = [] } = useTravelClients();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const isLoading = loadingTickets || loadingHotels || loadingCars;

  // Convert all reservations to calendar events
  const events = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    // Tickets
    tickets.forEach(ticket => {
      if (filterType !== 'all' && filterType !== 'ticket') return;
      if (filterStatus !== 'all' && ticket.status !== filterStatus) return;
      
      const client = clients.find(c => c.id === ticket.client_id);
      allEvents.push({
        id: ticket.id,
        type: 'ticket',
        title: `${ticket.origin} → ${ticket.destination}`,
        client: client?.name || 'Cliente',
        startDate: ticket.flight_date,
        endDate: ticket.return_date || undefined,
        status: ticket.status,
        details: `${ticket.airline} • ${ticket.passengers} pax • ${formatCurrency(ticket.sale_price || 0)}`,
      });
    });

    // Hotels
    hotels.forEach(hotel => {
      if (filterType !== 'all' && filterType !== 'hotel') return;
      if (filterStatus !== 'all' && hotel.status !== filterStatus) return;
      
      const client = clients.find(c => c.id === hotel.client_id);
      allEvents.push({
        id: hotel.id,
        type: 'hotel',
        title: hotel.hotel_name,
        client: client?.name || 'Cliente',
        startDate: hotel.check_in,
        endDate: hotel.check_out,
        status: hotel.status,
        details: `${hotel.city} • ${hotel.nights} noites • ${formatCurrency(hotel.sale_price || 0)}`,
      });
    });

    // Cars
    cars.forEach(car => {
      if (filterType !== 'all' && filterType !== 'car') return;
      if (filterStatus !== 'all' && car.status !== filterStatus) return;
      
      const client = clients.find(c => c.id === car.client_id);
      allEvents.push({
        id: car.id,
        type: 'car',
        title: car.rental_company,
        client: client?.name || 'Cliente',
        startDate: car.pickup_date,
        endDate: car.dropoff_date,
        status: car.status,
        details: `${car.vehicle_category} • ${car.days} dias • ${formatCurrency(car.sale_price || 0)}`,
      });
    });

    return allEvents;
  }, [tickets, hotels, cars, clients, filterType, filterStatus, formatCurrency]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days for the start of the month
    const startDay = start.getDay();
    const paddingDays = Array(startDay).fill(null);
    
    return [...paddingDays, ...days];
  }, [currentMonth]);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = parseISO(event.startDate);
      const eventEnd = event.endDate ? parseISO(event.endDate) : eventStart;
      
      return isSameDay(day, eventStart) || 
             isSameDay(day, eventEnd) || 
             (event.endDate && isWithinInterval(day, { start: eventStart, end: eventEnd }));
    });
  };

  const getEventColor = (type: string, status: string) => {
    if (status === 'cancelled') return 'bg-muted text-muted-foreground line-through';
    
    switch (type) {
      case 'ticket':
        return 'bg-info/20 text-info border-info/30';
      case 'hotel':
        return 'bg-violet-500/20 text-violet-700 border-violet-500/30';
      case 'car':
        return 'bg-primary/20 text-primary border-primary/30';
      default:
        return 'bg-muted';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ticket':
        return <Plane className="h-3 w-3" />;
      case 'hotel':
        return <Building2 className="h-3 w-3" />;
      case 'car':
        return <Car className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="text-[10px] px-1 py-0">Confirmado</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-[10px] px-1 py-0">Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="text-[10px] px-1 py-0">Cancelado</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1 py-0">{status}</Badge>;
    }
  };

  // Stats — scoped to the visible month so the cards summarize what's
  // actually rendered in the grid below. The audit flagged 0/0/0 because
  // the calendar landed on today's month while every event sat in past
  // months — see the auto-jump effect below.
  const monthEvents = events.filter(e => {
    const eventDate = parseISO(e.startDate);
    return isSameMonth(eventDate, currentMonth);
  });

  const ticketCount = monthEvents.filter(e => e.type === 'ticket').length;
  const hotelCount = monthEvents.filter(e => e.type === 'hotel').length;
  const carCount = monthEvents.filter(e => e.type === 'car').length;
  const hasEventsThisMonth = monthEvents.length > 0;
  const hasAnyEvents = events.length > 0;

  // On first load with events outside today's month, jump to the most recent
  // event's month so the user lands on a populated view instead of an empty
  // current-month grid that suggests "nothing is booked" (sas.txt Bug 9).
  const autoJumpedRef = useRef(false);
  useEffect(() => {
    if (autoJumpedRef.current || isLoading) return;
    if (events.length === 0) return;
    if (hasEventsThisMonth) {
      autoJumpedRef.current = true;
      return;
    }
    const mostRecent = [...events].sort((a, b) =>
      parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime()
    )[0];
    if (mostRecent) {
      setCurrentMonth(startOfMonth(parseISO(mostRecent.startDate)));
      autoJumpedRef.current = true;
    }
  }, [events, hasEventsThisMonth, isLoading]);

  return (
    <DashboardLayout title="Calendário de Reservas">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agência"
          icon={<CalendarIcon className="h-5 w-5" />}
          title="Calendário de Reservas"
          subtitle="Visualize todas as reservas da agência em um único calendário"
        />
        {/* Header with navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold min-w-[180px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Hoje
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[110px] sm:w-[140px] h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="ticket">
                  <div className="flex items-center gap-2">
                    <Plane className="h-3 w-3" /> Passagens
                  </div>
                </SelectItem>
                <SelectItem value="hotel">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3" /> Hotéis
                  </div>
                </SelectItem>
                <SelectItem value="car">
                  <div className="flex items-center gap-2">
                    <Car className="h-3 w-3" /> Carros
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats — labels say "neste mês" so 0/0/0 doesn't read as "you
            have nothing booked" when the data simply lives in another
            month. */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Plane className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Passagens neste mês</p>
                <p className="font-mono text-xl font-bold tabular-nums tracking-tight">{ticketCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Building2 className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hotéis neste mês</p>
                <p className="font-mono text-xl font-bold tabular-nums tracking-tight">{hotelCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Carros neste mês</p>
                <p className="font-mono text-xl font-bold tabular-nums tracking-tight">{carCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {!isLoading && !hasEventsThisMonth && hasAnyEvents && (
          <Card className="p-3 border-dashed bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Nenhum evento em {format(currentMonth, 'MMMM yyyy', { locale: ptBR })} — use as setas acima para navegar.
            </p>
          </Card>
        )}

        {/* Calendar */}
        <Card>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {WEEKDAYS.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="min-h-[100px] bg-muted/20 rounded-md" />;
                    }

                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[100px] border rounded-md p-1 ${
                          isToday ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <Popover key={event.id}>
                              <PopoverTrigger asChild>
                                <button
                                  className={`w-full text-left text-[10px] px-1 py-0.5 rounded border truncate flex items-center gap-1 hover:opacity-80 transition-opacity ${getEventColor(event.type, event.status)}`}
                                >
                                  {getEventIcon(event.type)}
                                  <span className="truncate">{event.title}</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-3" align="start">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {getEventIcon(event.type)}
                                      <span className="font-medium text-sm">{event.title}</span>
                                    </div>
                                    {getStatusBadge(event.status)}
                                  </div>
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <p><strong>Cliente:</strong> {event.client}</p>
                                    <p><strong>Data:</strong> {formatDate(event.startDate)}{event.endDate && event.endDate !== event.startDate ? ` - ${formatDate(event.endDate)}` : ''}</p>
                                    <p>{event.details}</p>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-muted-foreground text-center">
                              +{dayEvents.length - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-info/20 border border-info/30" />
            <span>Passagens</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-violet-500/20 border border-violet-500/30" />
            <span>Hotéis</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
            <span>Carros</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
