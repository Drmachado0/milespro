import { loadPDFLibraries } from './pdfLoader';
import { TravelClient, TravelTicket, TravelHotelReservation, TravelCarRental, TravelQuote, AgencySettings } from '@/hooks/travel';
import type { jsPDF } from 'jspdf';

type JsPDFWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY?: number;
  };
};

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  client: TravelClient;
  tickets?: TravelTicket[];
  hotels?: TravelHotelReservation[];
  cars?: TravelCarRental[];
  agencySettings?: AgencySettings | null;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (date: string): string => {
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
};

const formatNumber = (value: number): string => {
  return value.toLocaleString('pt-BR');
};

const getAgencyName = (settings?: AgencySettings | null): string => {
  return settings?.name || 'MilesPro';
};

const drawHeader = (doc: jsPDF, settings?: AgencySettings | null, title?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor: [number, number, number] = [234, 88, 12]; // Orange
  
  // Header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(getAgencyName(settings), 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Agência de Viagem', 20, 33);

  // Contact info on right side
  if (settings?.phone || settings?.email) {
    doc.setFontSize(8);
    let rightY = 22;
    if (settings.phone) {
      doc.text(settings.phone, pageWidth - 20, rightY, { align: 'right' });
      rightY += 5;
    }
    if (settings.email) {
      doc.text(settings.email, pageWidth - 20, rightY, { align: 'right' });
      rightY += 5;
    }
    if (settings.website) {
      doc.text(settings.website, pageWidth - 20, rightY, { align: 'right' });
    }
  }
};

const drawFooter = (doc: jsPDF, settings?: AgencySettings | null) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerY = doc.internal.pageSize.getHeight() - 25;
  const grayColor: [number, number, number] = [107, 114, 128];
  
  doc.setDrawColor(229, 231, 235);
  doc.line(20, footerY - 10, pageWidth - 20, footerY - 10);
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  
  // Agency info
  const agencyName = getAgencyName(settings);
  doc.text(`${agencyName} - Agência de Viagem`, pageWidth / 2, footerY, { align: 'center' });
  
  // Address line
  if (settings?.address || settings?.city) {
    const addressParts = [];
    if (settings.address) addressParts.push(settings.address);
    if (settings.city) addressParts.push(settings.city);
    if (settings.state) addressParts.push(settings.state);
    if (settings.zip_code) addressParts.push(`CEP: ${settings.zip_code}`);
    if (addressParts.length > 0) {
      doc.text(addressParts.join(' - '), pageWidth / 2, footerY + 5, { align: 'center' });
    }
  }
  
  doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, footerY + 12, { align: 'center' });
};

export async function generateInvoicePDF(data: InvoiceData): Promise<void> {
  const { jsPDF, autoTable } = await loadPDFLibraries();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const primaryColor: [number, number, number] = [234, 88, 12];
  const darkColor: [number, number, number] = [31, 41, 55];
  const grayColor: [number, number, number] = [107, 114, 128];

  let yPos = 20;

  // Header
  drawHeader(doc, data.agencySettings);
  
  // Invoice info
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`Fatura #${data.invoiceNumber}`, pageWidth - 60, 25);
  doc.setFontSize(10);
  doc.text(formatDate(data.date), pageWidth - 60, 33);

  yPos = 55;

  // Client Info
  doc.setTextColor(...darkColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Cliente', 20, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${data.client.name}`, 20, yPos);
  yPos += 6;
  doc.text(`CPF: ${data.client.cpf}`, 20, yPos);
  if (data.client.email) {
    yPos += 6;
    doc.text(`E-mail: ${data.client.email}`, 20, yPos);
  }
  if (data.client.phone) {
    yPos += 6;
    doc.text(`Telefone: ${data.client.phone}`, 20, yPos);
  }

  yPos += 15;

  // Tickets
  if (data.tickets && data.tickets.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('✈ Passagens Aéreas', 20, yPos);
    yPos += 5;

    const ticketData = data.tickets.map(t => [
      `${t.origin} → ${t.destination}`,
      t.airline,
      formatDate(t.flight_date),
      t.return_date ? formatDate(t.return_date) : '-',
      `${t.passengers} pax`,
      formatNumber(t.miles_used),
      formatCurrency(t.tax_brl),
      formatCurrency(t.total_cost_brl),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Trecho', 'Cia', 'Ida', 'Volta', 'Pax', 'Milhas', 'Taxas', 'Total']],
      body: ticketData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    });

    yPos = ((doc as JsPDFWithAutoTable).lastAutoTable?.finalY || yPos) + 10;
  }

  // Hotels
  if (data.hotels && data.hotels.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('🏨 Reservas de Hotel', 20, yPos);
    yPos += 5;

    const hotelData = data.hotels.map(h => [
      h.hotel_name,
      h.city,
      formatDate(h.check_in),
      formatDate(h.check_out),
      `${h.nights} noites`,
      formatNumber(h.miles_used),
      formatCurrency(h.tax_brl),
      formatCurrency(h.total_cost_brl),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Hotel', 'Cidade', 'Check-in', 'Check-out', 'Diárias', 'Milhas', 'Taxas', 'Total']],
      body: hotelData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 40 },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    });

    yPos = ((doc as JsPDFWithAutoTable).lastAutoTable?.finalY || yPos) + 10;
  }

  // Cars
  if (data.cars && data.cars.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('🚗 Aluguel de Carros', 20, yPos);
    yPos += 5;

    const carData = data.cars.map(c => [
      c.rental_company,
      `${c.pickup_location} → ${c.dropoff_location}`,
      formatDate(c.pickup_date),
      formatDate(c.dropoff_date),
      `${c.days} dias`,
      formatNumber(c.miles_used),
      formatCurrency(c.tax_brl),
      formatCurrency(c.total_cost_brl),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Locadora', 'Trecho', 'Retirada', 'Devolução', 'Dias', 'Milhas', 'Taxas', 'Total']],
      body: carData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        1: { cellWidth: 40 },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    });

    yPos = ((doc as JsPDFWithAutoTable).lastAutoTable?.finalY || yPos) + 10;
  }

  // Summary
  const totalMiles = (data.tickets?.reduce((sum, t) => sum + t.miles_used, 0) || 0) +
                     (data.hotels?.reduce((sum, h) => sum + h.miles_used, 0) || 0) +
                     (data.cars?.reduce((sum, c) => sum + c.miles_used, 0) || 0);
  
  const totalTaxes = (data.tickets?.reduce((sum, t) => sum + t.tax_brl, 0) || 0) +
                     (data.hotels?.reduce((sum, h) => sum + h.tax_brl, 0) || 0) +
                     (data.cars?.reduce((sum, c) => sum + c.tax_brl, 0) || 0);
  
  const totalCost = (data.tickets?.reduce((sum, t) => sum + t.total_cost_brl, 0) || 0) +
                    (data.hotels?.reduce((sum, h) => sum + h.total_cost_brl, 0) || 0) +
                    (data.cars?.reduce((sum, c) => sum + c.total_cost_brl, 0) || 0);

  yPos += 5;
  
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(pageWidth - 90, yPos, 70, 45, 3, 3, 'F');
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Milhas Utilizadas:', pageWidth - 85, yPos + 10);
  doc.text(formatNumber(totalMiles), pageWidth - 25, yPos + 10, { align: 'right' });
  
  doc.text('Taxas e Encargos:', pageWidth - 85, yPos + 20);
  doc.text(formatCurrency(totalTaxes), pageWidth - 25, yPos + 20, { align: 'right' });
  
  doc.setDrawColor(...primaryColor);
  doc.line(pageWidth - 85, yPos + 27, pageWidth - 25, yPos + 27);
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', pageWidth - 85, yPos + 38);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(totalCost), pageWidth - 25, yPos + 38, { align: 'right' });

  // Client balance
  doc.setTextColor(...grayColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Saldo de Milhas do Cliente: ${formatNumber(data.client.miles_balance)}`, 20, yPos + 20);

  // Footer
  drawFooter(doc, data.agencySettings);

  doc.save(`fatura-${data.invoiceNumber}-${data.client.name.replace(/\s+/g, '-')}.pdf`);
}

export async function generateTicketInvoice(ticket: TravelTicket, client: TravelClient, agencySettings?: AgencySettings | null): Promise<void> {
  const invoiceNumber = `P${Date.now().toString().slice(-8)}`;
  generateInvoicePDF({
    invoiceNumber,
    date: new Date().toISOString().split('T')[0],
    client,
    tickets: [ticket],
    agencySettings,
  });
}

export async function generateHotelInvoice(hotel: TravelHotelReservation, client: TravelClient | { name: string; cpf?: string; email?: string }, agencySettings?: AgencySettings | null): Promise<void> {
  const invoiceNumber = `H${Date.now().toString().slice(-8)}`;
  // Create a minimal client object for invoice generation
  const clientForInvoice: TravelClient = {
    id: 'id' in client ? client.id : '',
    user_id: 'user_id' in client ? client.user_id : '',
    name: client.name,
    cpf: client.cpf || '',
    email: client.email || '',
    phone: 'phone' in client ? client.phone : undefined,
    status: 'status' in client ? client.status : 'active',
    miles_balance: 'miles_balance' in client ? client.miles_balance : 0,
    total_miles_used: 'total_miles_used' in client ? client.total_miles_used : 0,
    total_spent_brl: 'total_spent_brl' in client ? client.total_spent_brl : 0,
    notes: 'notes' in client ? client.notes : undefined,
    created_at: 'created_at' in client ? client.created_at : new Date().toISOString(),
    updated_at: 'updated_at' in client ? client.updated_at : new Date().toISOString(),
  };
  generateInvoicePDF({
    invoiceNumber,
    date: new Date().toISOString().split('T')[0],
    client: clientForInvoice,
    hotels: [hotel],
    agencySettings,
  });
}

export async function generateCarInvoice(car: TravelCarRental, client: TravelClient | { name: string; cpf?: string; email?: string }, agencySettings?: AgencySettings | null): Promise<void> {
  const invoiceNumber = `C${Date.now().toString().slice(-8)}`;
  // Create a minimal client object for invoice generation
  const clientForInvoice: TravelClient = {
    id: 'id' in client ? client.id : '',
    user_id: 'user_id' in client ? client.user_id : '',
    name: client.name,
    cpf: client.cpf || '',
    email: client.email || '',
    phone: 'phone' in client ? client.phone : undefined,
    status: 'status' in client ? client.status : 'active',
    miles_balance: 'miles_balance' in client ? client.miles_balance : 0,
    total_miles_used: 'total_miles_used' in client ? client.total_miles_used : 0,
    total_spent_brl: 'total_spent_brl' in client ? client.total_spent_brl : 0,
    notes: 'notes' in client ? client.notes : undefined,
    created_at: 'created_at' in client ? client.created_at : new Date().toISOString(),
    updated_at: 'updated_at' in client ? client.updated_at : new Date().toISOString(),
  };
  generateInvoicePDF({
    invoiceNumber,
    date: new Date().toISOString().split('T')[0],
    client: clientForInvoice,
    cars: [car],
    agencySettings,
  });
}

export async function generateClientStatement(
  client: TravelClient,
  tickets: TravelTicket[],
  hotels: TravelHotelReservation[],
  cars: TravelCarRental[],
  agencySettings?: AgencySettings | null
): Promise<void> {
  const invoiceNumber = `E${Date.now().toString().slice(-8)}`;
  generateInvoicePDF({
    invoiceNumber,
    date: new Date().toISOString().split('T')[0],
    client,
    tickets: tickets.filter(t => t.client_id === client.id),
    hotels: hotels.filter(h => h.client_id === client.id),
    cars: cars.filter(c => c.client_id === client.id),
    agencySettings,
  });
}

export async function generateQuotePDF(quote: TravelQuote, client: TravelClient, agencySettings?: AgencySettings | null): Promise<void> {
  const { jsPDF, autoTable } = await loadPDFLibraries();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const primaryColor: [number, number, number] = [124, 58, 237]; // Purple
  const darkColor: [number, number, number] = [31, 41, 55];
  const grayColor: [number, number, number] = [107, 114, 128];

  let yPos = 20;

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(getAgencyName(agencySettings), 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Agência de Viagem', 20, 33);

  // Contact info
  if (agencySettings?.phone || agencySettings?.email) {
    doc.setFontSize(8);
    let rightY = 15;
    if (agencySettings.phone) {
      doc.text(agencySettings.phone, pageWidth - 60, rightY);
      rightY += 5;
    }
    if (agencySettings.email) {
      doc.text(agencySettings.email, pageWidth - 60, rightY);
    }
  }
  
  // Quote Badge
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', pageWidth - 20, 20, { align: 'right' });
  doc.setFontSize(12);
  doc.text(`#${quote.quote_number}`, pageWidth - 20, 30, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido em: ${formatDate(new Date().toISOString().split('T')[0])}`, pageWidth - 20, 38, { align: 'right' });

  yPos = 60;

  // Client Info
  doc.setTextColor(...darkColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente', 20, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${client.name}`, 20, yPos);
  yPos += 6;
  doc.text(`CPF: ${client.cpf}`, 20, yPos);
  if (client.email) {
    yPos += 6;
    doc.text(`E-mail: ${client.email}`, 20, yPos);
  }
  if (client.phone) {
    yPos += 6;
    doc.text(`Telefone: ${client.phone}`, 20, yPos);
  }

  // Validity
  if (quote.valid_until) {
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Válido até: ${formatDate(quote.valid_until)}`, pageWidth - 20, 60, { align: 'right' });
  }

  yPos += 15;

  // Quote Type
  const typeLabels: Record<string, string> = {
    ticket: '✈️ Passagem Aérea',
    hotel: '🏨 Reserva de Hotel',
    car: '🚗 Aluguel de Carro',
    package: '📦 Pacote de Viagem',
  };

  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(typeLabels[quote.quote_type] || 'Orçamento', 20, yPos);
  yPos += 10;

  // Details
  const detailsData: string[][] = [];

  if (quote.quote_type === 'ticket') {
    if (quote.origin && quote.destination) {
      detailsData.push(['Trecho', `${quote.origin} → ${quote.destination}`]);
    }
    if (quote.airline) detailsData.push(['Companhia Aérea', quote.airline]);
    if (quote.flight_date) detailsData.push(['Data do Voo', formatDate(quote.flight_date)]);
    if (quote.return_date && !quote.one_way) detailsData.push(['Data de Retorno', formatDate(quote.return_date)]);
    if (quote.one_way) detailsData.push(['Tipo', 'Somente Ida']);
    if (quote.passengers) detailsData.push(['Passageiros', quote.passengers.toString()]);
  } else if (quote.quote_type === 'hotel') {
    if (quote.hotel_name) detailsData.push(['Hotel', quote.hotel_name]);
    if (quote.city) detailsData.push(['Cidade', quote.city]);
    if (quote.check_in) detailsData.push(['Check-in', formatDate(quote.check_in)]);
    if (quote.check_out) detailsData.push(['Check-out', formatDate(quote.check_out)]);
    if (quote.nights) detailsData.push(['Diárias', `${quote.nights} noite(s)`]);
    if (quote.rooms) detailsData.push(['Quartos', quote.rooms.toString()]);
    if (quote.hotel_program) detailsData.push(['Programa de Fidelidade', quote.hotel_program]);
  } else if (quote.quote_type === 'car') {
    if (quote.rental_company) detailsData.push(['Locadora', quote.rental_company]);
    if (quote.pickup_location && quote.dropoff_location) {
      detailsData.push(['Retirada', quote.pickup_location]);
      detailsData.push(['Devolução', quote.dropoff_location]);
    }
    if (quote.pickup_date) detailsData.push(['Data Retirada', formatDate(quote.pickup_date)]);
    if (quote.dropoff_date) detailsData.push(['Data Devolução', formatDate(quote.dropoff_date)]);
    if (quote.days) detailsData.push(['Dias', `${quote.days} dia(s)`]);
    if (quote.vehicle_category) detailsData.push(['Categoria', quote.vehicle_category]);
  }

  if (quote.miles_program) {
    detailsData.push(['Programa de Milhas', quote.miles_program]);
  }

  if (detailsData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      body: detailsData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50, textColor: grayColor },
        1: { textColor: darkColor },
      },
      margin: { left: 20, right: 20 },
    });
    yPos = ((doc as JsPDFWithAutoTable).lastAutoTable?.finalY || yPos) + 10;
  }

  // Description
  if (quote.description) {
    doc.setTextColor(...grayColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const descLines = doc.splitTextToSize(quote.description, pageWidth - 40);
    doc.text(descLines, 20, yPos);
    yPos += descLines.length * 5 + 10;
  }

  // Pricing Box
  yPos += 5;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(20, yPos, pageWidth - 40, 70, 3, 3, 'F');
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Valores do Orçamento', 30, yPos + 12);

  const priceStartY = yPos + 22;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);

  doc.text('Milhas Estimadas:', 30, priceStartY);
  doc.setTextColor(...darkColor);
  doc.text(formatNumber(quote.miles_estimate), pageWidth - 30, priceStartY, { align: 'right' });

  doc.setTextColor(...grayColor);
  doc.text('Taxas e Encargos:', 30, priceStartY + 10);
  doc.setTextColor(...darkColor);
  doc.text(formatCurrency(quote.tax_estimate), pageWidth - 30, priceStartY + 10, { align: 'right' });

  doc.setTextColor(...grayColor);
  doc.text('Custo Estimado:', 30, priceStartY + 20);
  doc.setTextColor(...darkColor);
  doc.text(formatCurrency(quote.cost_estimate), pageWidth - 30, priceStartY + 20, { align: 'right' });

  doc.setDrawColor(...primaryColor);
  doc.line(30, priceStartY + 30, pageWidth - 30, priceStartY + 30);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('VALOR TOTAL:', 30, priceStartY + 42);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(quote.sale_price), pageWidth - 30, priceStartY + 42, { align: 'right' });

  // Notes
  if (quote.notes) {
    yPos += 85;
    doc.setTextColor(...grayColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Observações:', 20, yPos);
    yPos += 5;
    const noteLines = doc.splitTextToSize(quote.notes, pageWidth - 40);
    doc.text(noteLines, 20, yPos);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 30;
  
  doc.setDrawColor(229, 231, 235);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Este orçamento é válido mediante confirmação e disponibilidade.', pageWidth / 2, footerY + 2, { align: 'center' });
  doc.text('Preços sujeitos a alteração sem aviso prévio.', pageWidth / 2, footerY + 7, { align: 'center' });
  doc.text(`${getAgencyName(agencySettings)} - Agência de Viagem`, pageWidth / 2, footerY + 15, { align: 'center' });
  doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, footerY + 20, { align: 'center' });

  doc.save(`orcamento-${quote.quote_number}-${client.name.replace(/\s+/g, '-')}.pdf`);
}
