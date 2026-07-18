import { Card, CardContent } from '@/components/ui/card';
import { useLocalization } from '@/hooks/useLocalization';
import { Wallet, AlertCircle } from 'lucide-react';

interface AssetsDeclarationAlertProps {
  totalPurchased: number;
  threshold: number;
}

export function AssetsDeclarationAlert({ totalPurchased, threshold }: AssetsDeclarationAlertProps) {
  const { formatCurrency, t } = useLocalization();
  
  const mustDeclare = totalPurchased > threshold;
  
  if (!mustDeclare) return null;

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <Wallet className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-medium">{t('incomeTax.assetDeclarationTitle')}</p>
              <AlertCircle className="h-4 w-4 text-warning" />
            </div>
            
            <p className="text-sm text-muted-foreground">
              {t('incomeTax.assetDeclarationMessage', { 
                amount: formatCurrency(totalPurchased),
                threshold: formatCurrency(threshold)
              })}
            </p>
            
            <div className="pt-2 border-t mt-2">
              <p className="text-xs font-medium">{t('incomeTax.howToDeclare')}:</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <li>• {t('incomeTax.assetsGroup')}</li>
                <li>• {t('incomeTax.assetsCode')}</li>
                <li>• {t('incomeTax.assetsDescription')}</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
