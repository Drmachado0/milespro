import { ProgramLogo } from '@/components/ui/program-logo';

const programs = [
  'Livelo',
  'Smiles',
  'Azul Fidelidade',
  'LatamPass',
  'Esfera',
  'TAP Miles&Go',
  'Marriott Bonvoy',
  'All Accor',
  'AAdvantage',
  'Delta SkyMiles',
];

export const ProgramsLogoBar = () => {
  return (
    <section className="py-6 px-4 bg-muted/30 border-y border-border">
      <div className="container mx-auto">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Compatível com <span className="font-medium text-foreground">70+ programas de fidelidade</span>
          </p>
          
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {programs.map((program) => (
              <div 
                key={program}
                className="opacity-70 hover:opacity-100 transition-opacity"
                title={program}
              >
                <ProgramLogo program={program} size="sm" />
              </div>
            ))}
            <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
              +60
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
