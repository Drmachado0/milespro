import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProgramLogo } from '@/components/ui/program-logo';
import { PROGRAMS_BY_CATEGORY, ProgramInfo } from '@/data/programs';

interface ProgramSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  categories?: ('pontos' | 'bancos' | 'brasil' | 'americas' | 'europa' | 'asia' | 'hotels' | 'outros')[];
  disabled?: boolean;
}

export function ProgramSelect({ 
  value, 
  onValueChange, 
  placeholder = 'Selecione o programa',
  categories,
  disabled = false,
}: ProgramSelectProps) {
  const categoriesToShow = categories || ['pontos', 'bancos', 'brasil', 'americas', 'europa', 'asia', 'hotels', 'outros'];
  
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        {value ? (
          <div className="flex items-center gap-2">
            <ProgramLogo program={value} size="sm" />
            <span>{value}</span>
          </div>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {categoriesToShow.map((categoryKey) => {
          const category = PROGRAMS_BY_CATEGORY[categoryKey];
          if (!category) return null;
          
          return (
            <SelectGroup key={categoryKey}>
              <SelectLabel className="text-xs text-muted-foreground uppercase tracking-wide">
                {category.title}
              </SelectLabel>
              {category.programs.map((prog: ProgramInfo) => (
                <SelectItem key={prog.name} value={prog.name}>
                  <div className="flex items-center gap-2">
                    <ProgramLogo program={prog.name} size="sm" />
                    <span>{prog.name}</span>
                    {prog.airline && (
                      <span className="text-xs text-muted-foreground">({prog.airline})</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
