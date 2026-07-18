import { Download, FileSpreadsheet, FileText, Table2, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { auditExport } from '@/lib/auditLogger';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReportExportProps {
  data: Record<string, unknown>[];
  columns: { key: string; label: string }[];
  reportName: string;
}

export function ReportExport({ data, columns, reportName }: ReportExportProps) {
  const { features } = useSubscription();
  const navigate = useNavigate();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const hasExportAccess = features.export_excel_pdf;

  const checkAccess = (): boolean => {
    if (!hasExportAccess) {
      setShowUpgradeDialog(true);
      return false;
    }
    return true;
  };

  const exportToCSV = () => {
    if (!checkAccess()) return;
    
    if (data.length === 0) {
      toast({
        title: 'Sem dados',
        description: 'Não há dados para exportar',
        variant: 'destructive',
      });
      return;
    }

    const headers = columns.map(c => c.label).join(';');
    const rows = data.map(row => 
      columns.map(c => {
        const value = row[c.key];
        if (typeof value === 'number') {
          return String(value).replace('.', ',');
        }
        return String(value ?? '');
      }).join(';')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    // Log the export event
    auditExport.csv(reportName, data.length);

    toast({
      title: 'CSV Exportado',
      description: 'Arquivo baixado com sucesso',
    });
  };

  const exportToJSON = () => {
    if (!checkAccess()) return;
    
    if (data.length === 0) {
      toast({
        title: 'Sem dados',
        description: 'Não há dados para exportar',
        variant: 'destructive',
      });
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportName}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    // Log the export event
    auditExport.json(reportName, data.length);

    toast({
      title: 'JSON Exportado',
      description: 'Arquivo baixado com sucesso',
    });
  };

  const printReport = () => {
    if (!checkAccess()) return;
    window.print();
  };

  return (
    <>
      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Exportação Premium</DialogTitle>
            <DialogDescription className="text-center">
              A exportação para CSV, JSON e impressão está disponível apenas nos planos Basic e Pro Família.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
            <Button
              onClick={() => {
                setShowUpgradeDialog(false);
                navigate('/assinatura');
              }}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Ver planos
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeDialog(false)}
              className="w-full"
            >
              Voltar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportToCSV}
          className={!hasExportAccess ? 'opacity-75' : ''}
        >
          {!hasExportAccess && <Lock className="h-3 w-3 mr-1" />}
          <Table2 className="h-4 w-4 mr-2" />
          CSV
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportToJSON}
          className={!hasExportAccess ? 'opacity-75' : ''}
        >
          {!hasExportAccess && <Lock className="h-3 w-3 mr-1" />}
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          JSON
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={printReport}
          className={!hasExportAccess ? 'opacity-75' : ''}
        >
          {!hasExportAccess && <Lock className="h-3 w-3 mr-1" />}
          <FileText className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>
    </>
  );
}
