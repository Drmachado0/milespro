import { HelpCircle } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SimulatorDescriptionProps {
  title: string;
  description: string;
  steps: string[];
  tips?: string[];
}

export function SimulatorDescription({ title, description, steps, tips }: SimulatorDescriptionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-7 px-2 text-xs gap-1",
            isOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Como usar
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-fade-in">
        <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3">
          <p className="text-xs text-muted-foreground">{description}</p>
          
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Passo a passo:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              {steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
          
          {tips && tips.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">💡 Dicas:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                {tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
