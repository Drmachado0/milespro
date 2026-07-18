import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProgramLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProgramLimitDialog({ open, onOpenChange }: ProgramLimitDialogProps) {
  const navigate = useNavigate();
  
  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/assinatura');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <DialogTitle className="text-center">Limite atingido</DialogTitle>
          <DialogDescription className="text-center">
            Você atingiu o limite de 3 programas do plano Gratuito. 
            Faça upgrade para o Basic para registrar todos os seus programas sem limite.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-primary hover:bg-primary text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Fazer upgrade
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Voltar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
