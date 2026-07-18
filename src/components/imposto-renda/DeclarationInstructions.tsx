import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLocalization } from '@/hooks/useLocalization';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, ChevronDown, ChevronUp, FileText, Calculator, Wallet, ExternalLink, Download, Info, Lightbulb, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepProps {
  number: number;
  title: string;
  description: string;
}

function DeclarationStep({ number, title, description }: StepProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="space-y-1 flex-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

interface TipProps {
  variant: 'info' | 'warning' | 'success';
  children: React.ReactNode;
}

function DeclarationTip({ variant, children }: TipProps) {
  const icons = {
    info: <Lightbulb className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    success: <Info className="h-4 w-4" />,
  };

  const classes = {
    info: 'border-info/50 bg-info/10',
    warning: 'border-warning/50 bg-warning/10',
    success: 'border-success/50 bg-success/10',
  };

  return (
    <Alert className={`${classes[variant]} mt-4`}>
      {icons[variant]}
      <AlertDescription className="text-sm">{children}</AlertDescription>
    </Alert>
  );
}

export function DeclarationInstructions() {
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{t('incomeTax.declarationGuide')}</CardTitle>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Accordion type="multiple" className="w-full">
              {/* Bens e Direitos */}
              <AccordionItem value="assets">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <span className="font-medium">{t('incomeTax.instructionAssets')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-1">{t('incomeTax.instructionAssetsWhen')}</p>
                    <p className="text-sm text-muted-foreground">{t('incomeTax.instructionAssetsWhenDesc')}</p>
                  </div>

                  <div className="space-y-4">
                    <DeclarationStep
                      number={1}
                      title={t('incomeTax.instructionAssetsStep1Title')}
                      description={t('incomeTax.instructionAssetsStep1Desc')}
                    />
                    <DeclarationStep
                      number={2}
                      title={t('incomeTax.instructionAssetsStep2Title')}
                      description={t('incomeTax.instructionAssetsStep2Desc')}
                    />
                    <DeclarationStep
                      number={3}
                      title={t('incomeTax.instructionAssetsStep3Title')}
                      description={t('incomeTax.instructionAssetsStep3Desc')}
                    />
                    <DeclarationStep
                      number={4}
                      title={t('incomeTax.instructionAssetsStep4Title')}
                      description={t('incomeTax.instructionAssetsStep4Desc')}
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 border border-dashed">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('incomeTax.exampleDiscrimination')}</p>
                    <p className="text-sm italic">"{t('incomeTax.exampleDiscriminationText')}"</p>
                  </div>

                  <DeclarationTip variant="info">
                    {t('incomeTax.tipAssets')}
                  </DeclarationTip>
                </AccordionContent>
              </AccordionItem>

              {/* Rendimentos Isentos */}
              <AccordionItem value="exempt">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">{t('incomeTax.instructionExempt')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-1">{t('incomeTax.instructionExemptWhen')}</p>
                    <p className="text-sm text-muted-foreground">{t('incomeTax.instructionExemptWhenDesc')}</p>
                  </div>

                  <div className="space-y-4">
                    <DeclarationStep
                      number={1}
                      title={t('incomeTax.instructionExemptStep1Title')}
                      description={t('incomeTax.instructionExemptStep1Desc')}
                    />
                    <DeclarationStep
                      number={2}
                      title={t('incomeTax.instructionExemptStep2Title')}
                      description={t('incomeTax.instructionExemptStep2Desc')}
                    />
                    <DeclarationStep
                      number={3}
                      title={t('incomeTax.instructionExemptStep3Title')}
                      description={t('incomeTax.instructionExemptStep3Desc')}
                    />
                  </div>

                  <DeclarationTip variant="info">
                    {t('incomeTax.tipExempt')}
                  </DeclarationTip>
                </AccordionContent>
              </AccordionItem>

              {/* GCAP e DARF */}
              <AccordionItem value="gcap">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="font-medium">{t('incomeTax.instructionTaxable')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-1">{t('incomeTax.instructionGcapWhen')}</p>
                    <p className="text-sm text-muted-foreground">{t('incomeTax.instructionGcapWhenDesc')}</p>
                  </div>

                  <div className="space-y-4">
                    <DeclarationStep
                      number={1}
                      title={t('incomeTax.instructionGcapStep1Title')}
                      description={t('incomeTax.instructionGcapStep1Desc')}
                    />
                    <DeclarationStep
                      number={2}
                      title={t('incomeTax.instructionGcapStep2Title')}
                      description={t('incomeTax.instructionGcapStep2Desc')}
                    />
                    <DeclarationStep
                      number={3}
                      title={t('incomeTax.instructionGcapStep3Title')}
                      description={t('incomeTax.instructionGcapStep3Desc')}
                    />
                    <DeclarationStep
                      number={4}
                      title={t('incomeTax.instructionGcapStep4Title')}
                      description={t('incomeTax.instructionGcapStep4Desc')}
                    />
                    <DeclarationStep
                      number={5}
                      title={t('incomeTax.instructionGcapStep5Title')}
                      description={t('incomeTax.instructionGcapStep5Desc')}
                    />
                  </div>

                  {/* DARF Info */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-sm font-medium">{t('incomeTax.darfInfo')}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('incomeTax.darfCode')}:</span>
                        <span className="font-mono ml-1">4600</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('incomeTax.taxRate')}:</span>
                        <span className="font-mono ml-1">15%</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('incomeTax.darfDeadline')}</p>
                  </div>

                  {/* Download GCAP */}
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{t('incomeTax.gcapProgram')}</p>
                      <p className="text-xs text-muted-foreground">{t('incomeTax.gcapDescription')}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href="https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/download/pgd/gcap" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        {t('incomeTax.downloadGcap')}
                      </a>
                    </Button>
                  </div>

                  <DeclarationTip variant="warning">
                    {t('incomeTax.tipGcap')}
                  </DeclarationTip>
                </AccordionContent>
              </AccordionItem>

              {/* Importar na Declaração */}
              <AccordionItem value="import">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    <span className="font-medium">{t('incomeTax.instructionImportTitle')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="space-y-4">
                    <DeclarationStep
                      number={1}
                      title={t('incomeTax.instructionImportStep1Title')}
                      description={t('incomeTax.instructionImportStep1Desc')}
                    />
                    <DeclarationStep
                      number={2}
                      title={t('incomeTax.instructionImportStep2Title')}
                      description={t('incomeTax.instructionImportStep2Desc')}
                    />
                    <DeclarationStep
                      number={3}
                      title={t('incomeTax.instructionImportStep3Title')}
                      description={t('incomeTax.instructionImportStep3Desc')}
                    />
                  </div>

                  <DeclarationTip variant="success">
                    {t('incomeTax.tipImport')}
                  </DeclarationTip>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
