import { loadPDFLibraries } from './pdfLoader';

type JsPDFWithAutoTable = import('jspdf').default & {
  lastAutoTable?: {
    finalY?: number;
  };
};

interface TaxMonthData {
  month: string;
  monthLabel: string;
  totalSales: number;
  totalCost: number;
  profit: number;
  isExempt: boolean;
  taxDue: number;
  operations: number;
  milesSold: number;
  costPerThousand: number;
  percentOfLimit: number;
}

interface TaxProgramData {
  program: string;
  totalSales: number;
  totalCost: number;
  profit: number;
  milesSold: number;
  costPerThousand: number;
}

interface TaxSummary {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  totalTaxDue: number;
  exemptMonths: number;
  taxableMonths: number;
  totalMilesSold: number;
  avgCostPerThousand: number;
}

interface IncomeTaxReportData {
  year: number;
  monthlyData: TaxMonthData[];
  programData: TaxProgramData[];
  summary: TaxSummary;
  exemptionLimit: number;
  taxRate: number;
  holderName?: string;
  holderCpf?: string;
  programFilter?: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(0)}%`;
};

const formatCPF = (cpf: string): string => {
  // Remove non-digits
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export async function generateIncomeTaxPDF(data: IncomeTaxReportData): Promise<void> {
  const { jsPDF, autoTable } = await loadPDFLibraries();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const primaryColor: [number, number, number] = [37, 99, 235];
  const darkColor: [number, number, number] = [31, 41, 55];
  const grayColor: [number, number, number] = [107, 114, 128];
  const successColor: [number, number, number] = [22, 163, 74];
  const dangerColor: [number, number, number] = [220, 38, 38];

  let yPos = 20;

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Imposto de Renda', 20, 22);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Operações com Milhas - Ano Base ${data.year}`, 20, 32);
  
  doc.setFontSize(10);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 20, 40);

  yPos = 60;

  // Holder info (if filtered by holder)
  if (data.holderName || data.holderCpf) {
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(20, yPos - 5, pageWidth - 40, data.holderCpf ? 22 : 14, 3, 3, 'F');
    
    doc.setTextColor(...darkColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Titular:', 25, yPos + 3);
    
    doc.setFont('helvetica', 'normal');
    const holderText = data.holderName || 'Não informado';
    doc.text(holderText, 50, yPos + 3);
    
    if (data.holderCpf) {
      doc.setFont('helvetica', 'bold');
      doc.text('CPF:', 25, yPos + 12);
      doc.setFont('helvetica', 'normal');
      doc.text(formatCPF(data.holderCpf), 42, yPos + 12);
    }
    
    yPos += data.holderCpf ? 28 : 18;
  }

  // Filters applied (program only, holder shown above)
  if (data.programFilter) {
    doc.setTextColor(...grayColor);
    doc.setFontSize(9);
    doc.text(`Programa: ${data.programFilter}`, 20, yPos);
    yPos += 10;
  }

  // Tax Rules Info Box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(20, yPos, pageWidth - 40, 42, 3, 3, 'F');
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Regras Aplicáveis - Legislação Brasileira', 25, yPos + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`• Isenção: Vendas mensais até ${formatCurrency(data.exemptionLimit)} são isentas de IR`, 25, yPos + 16);
  doc.text(`• Alíquota: ${formatPercentage(data.taxRate)} sobre o lucro tributável quando vendas excedem o limite`, 25, yPos + 23);
  doc.text(`• Prazo DARF: Até o último dia útil do mês seguinte à venda (código 4600)`, 25, yPos + 30);
  doc.text(`• GCAP: Vendas tributáveis devem ser registradas no programa GCAP da Receita Federal`, 25, yPos + 37);

  yPos += 52;

  // Summary KPIs - Now with 5 KPIs including miles sold
  doc.setTextColor(...darkColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do Período', 20, yPos);
  yPos += 8;

  const kpiBoxWidth = (pageWidth - 55) / 5;
  const kpis = [
    { label: 'Total Vendido', value: formatCurrency(data.summary.totalSales), color: primaryColor },
    { label: 'Custo Estimado', value: formatCurrency(data.summary.totalCost), color: grayColor },
    { label: 'Lucro Tributável', value: formatCurrency(data.summary.totalProfit), color: data.summary.totalProfit >= 0 ? successColor : dangerColor },
    { label: 'Milhas Vendidas', value: formatNumber(data.summary.totalMilesSold), color: primaryColor },
    { label: 'IR Estimado', value: formatCurrency(data.summary.totalTaxDue), color: dangerColor },
  ];

  kpis.forEach((kpi, index) => {
    const x = 20 + index * (kpiBoxWidth + 3);
    
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(x, yPos, kpiBoxWidth, 22, 2, 2, 'F');
    
    doc.setTextColor(...grayColor);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, x + 3, yPos + 7);
    
    doc.setTextColor(...kpi.color);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x + 3, yPos + 16);
  });

  yPos += 32;

  // Additional summary info
  doc.setTextColor(...grayColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Meses isentos: ${data.summary.exemptMonths} | Meses tributáveis: ${data.summary.taxableMonths} | Custo médio/milheiro: ${formatCurrency(data.summary.avgCostPerThousand)}`, 20, yPos);
  
  yPos += 12;

  // Monthly Breakdown Table - Now with miles columns
  doc.setTextColor(...darkColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhamento Mensal', 20, yPos);
  yPos += 5;

  const monthlyTableData = data.monthlyData.map(m => [
    m.monthLabel,
    formatNumber(m.milesSold),
    formatCurrency(m.costPerThousand),
    formatCurrency(m.totalSales),
    formatCurrency(m.totalCost),
    formatCurrency(m.profit),
    m.isExempt ? 'ISENTO' : (m.taxDue > 0 ? 'TRIBUTÁVEL' : 'SEM LUCRO'),
    formatCurrency(m.taxDue),
  ]);

  // Add total row
  monthlyTableData.push([
    'TOTAL',
    formatNumber(data.summary.totalMilesSold),
    formatCurrency(data.summary.avgCostPerThousand),
    formatCurrency(data.summary.totalSales),
    formatCurrency(data.summary.totalCost),
    formatCurrency(data.summary.totalProfit),
    `${data.summary.exemptMonths} isentos`,
    formatCurrency(data.summary.totalTaxDue),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Mês', 'Milhas', 'Custo/Mil', 'Vendas', 'Custo', 'Lucro', 'Status', 'IR']],
    body: monthlyTableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkColor,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22 },
      1: { halign: 'right', cellWidth: 22 },
      2: { halign: 'right', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 24 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'center', cellWidth: 22 },
      7: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
    },
    didParseCell: (hookData) => {
      if (hookData.row.index === monthlyTableData.length - 1) {
        hookData.cell.styles.fillColor = [243, 244, 246];
        hookData.cell.styles.fontStyle = 'bold';
      }
      if (hookData.column.index === 6 && hookData.section === 'body') {
        const value = hookData.cell.raw as string;
        if (value === 'ISENTO') {
          hookData.cell.styles.textColor = successColor;
        } else if (value === 'TRIBUTÁVEL') {
          hookData.cell.styles.textColor = dangerColor;
        }
      }
    },
    margin: { left: 20, right: 20 },
  });

  // Check if we need a new page for program breakdown
  const finalY = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY || yPos + 100;
  
  if (data.programData.length > 0) {
    let programY = finalY + 15;
    
    if (programY > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      programY = 20;
    }

    doc.setTextColor(...darkColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento por Programa', 20, programY);
    
    // Note about IR calculation
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...grayColor);
    programY += 6;
    doc.text('Nota: O IR é calculado sobre o total mensal de vendas, não por programa individual.', 20, programY);
    programY += 4;

    // Program table WITHOUT IR column
    const programTableData = data.programData.map(p => [
      p.program,
      formatNumber(p.milesSold),
      formatCurrency(p.costPerThousand),
      formatCurrency(p.totalSales),
      formatCurrency(p.totalCost),
      formatCurrency(p.profit),
    ]);

    autoTable(doc, {
      startY: programY,
      head: [['Programa', 'Milhas', 'Custo/Mil', 'Vendas (R$)', 'Custo (R$)', 'Lucro (R$)']],
      body: programTableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: darkColor,
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    });
  }

  // Footer with enhanced information
  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(229, 231, 235);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.text('IMPORTANTE: Milhas orgânicas (acumuladas sem compra) podem ter custo R$ 0,00 para fins fiscais.', 20, footerY);
  doc.text('Vendas mensais abaixo de R$ 35.000 são isentas, mas devem ser declaradas em "Rendimentos Isentos".', 20, footerY + 5);
  doc.text('Compras de milhas acima de R$ 5.000 no ano devem ser declaradas em "Bens e Direitos" (Grupo 99, Código 99).', 20, footerY + 10);
  doc.text('Este relatório é apenas informativo. Consulte um contador para orientação fiscal adequada.', 20, footerY + 15);
  doc.setFont('helvetica', 'bold');
  doc.text('Código DARF: 4600 (Ganho de Capital - PF) | Programa GCAP: www.gov.br/receitafederal', 20, footerY + 20);

  // Save PDF
  doc.save(`imposto-renda-milhas-${data.year}.pdf`);
}
