import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Rocket, Loader2, CreditCard, Calendar, CalendarDays } from 'lucide-react';
import { HolderSelect } from '@/components/forms/HolderSelect';
import { ProgramSelect } from '@/components/forms/ProgramSelect';
import { useOperations } from '@/hooks/useOperations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { CardBrandIcon, getBrandFromName } from '@/components/ui/card-brand-icon';
import { useLocalization } from '@/hooks/useLocalization';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import { validadeOptions } from '@/data/validadeOptions';
import { logger } from '@/lib/logger';

type CreditCardRow = Database['public']['Tables']['credit_cards']['Row'] & {
  holders?: { name: string | null } | null;
};

const destinoProdutoOptions = [
  { value: 'uso_proprio', label: 'Uso Próprio' },
  { value: 'revenda', label: 'Revenda' },
  { value: 'presente', label: 'Presente' },
];

// Removed fixed diasBonusOptions - now user can input any number of days

const lojasParceiras = [
  'ABC da Construção', 'ACER', 'ADCOS', 'AMOBELEZA', 'Abelha Rainha',
  'Agaxtur Cruzeiros', 'Aliexpress', 'Allianz', 'Alura', 'Amazon',
  'Angeloni', 'Aramis', 'Asics', 'Assist Card Seguro-Viagem', 'Avon',
  'Azul Viagens', 'BO.BÔ', 'Bagaggio', 'Baianão', 'Bankei',
  'Basicamente', 'Basico.com', 'Beach Park Hospedagens', 'Beach Park Ingressos',
  'Beep', 'Beleza na Web PRO', 'Beleza na web', 'Beto Carrero World',
  'Beyoung', 'Bibi', 'Bobstore', 'Bombay Herbs & Spices', 'Bonjour Lingerie',
  'Booking.com', 'Bradesco Capitalização', 'Buddha Spa', 'Budget', 'Bulbe Energia',
  'Buser', 'CARE Natural Beauty', 'CEA', 'Cabana Magazine', 'Caffeine Army',
  'Café Orfeu', 'Camicado', 'Carrefour Mercado', 'Carrefour Shopping',
  'Cartão de Todos', 'Casas Bahia', 'Centauro', 'Cestas Michelli',
  'Chip eSim Travalex', 'Cinemark', 'Claro', 'ClickBus', 'Clima Rio',
  'Coffee Mais', 'Colcci', 'Coliseu', 'Consorcio Magalu', 'Converse',
  'Cook Eletroraro', 'Coris', 'Creditas', 'Crocs', 'Câmbio Online',
  'Dafiti', 'Dako', 'Decathlon', 'Decolar', 'Democrata', 'Divvino',
  'Dr Jones', 'Drogaria São Paulo', 'Drogarias Pacheco', 'Dudalina',
  'Dufrio', 'EDP', 'Easy Live', 'Ellus', 'Embracon', 'Estoque', 'Eudora',
  'Euro', 'Extra', 'Faber-Castell', 'Farmacias App', 'Fast Shop', 'Fila',
  'Foco', 'Forever Liss', 'Frigelar', 'Fóssil', 'Gazin', 'Giuliana Flores',
  'Globoplay', 'Go case', 'Granado', 'Grupo Dreams', 'Guess', 'Guldi',
  'HERO SEGURO VIAGEM', 'Havaianas', 'Hering', 'Hering Outlet',
  'Hero Seguro Celular', 'Hertz Internacional', 'Home Angels', 'Hope',
  'Hope Resort', 'Horas Magicas', 'Hot Beach', 'Hoteis.com', 'Imaginarium',
  'Individual', 'Infinix', 'Insider Store', 'John John', 'Kabum!', 'Kaligo',
  'Klabin ForYou', 'LE LIS', 'LEGO', 'LIVE!', 'Lacoste',
  'Liga Vitória - Seguro de Viagem', 'Liz', 'Localiza', 'Localiza Meoo',
  'Loccitane', 'Loccitane au Bresil', 'Loungerie', 'Luxury Loyalty',
  'MAPFRE Seguro Auto', 'Magalu', 'Maltacor', 'Malwee', 'Max Titanium',
  'MaxRacer', 'MedSênior', 'Meia Sola', 'Mercado Livre', 'Mevo Farma',
  'Midea', 'Mistral', 'Mizuno', 'Mobills', 'Mobly', 'Mondaine',
  'Monte Carlo', 'Morana', 'Movida', 'Mycon Consórcio Digital', 'Nars',
  'Natura', 'Netshoes', 'New Balance', 'Next Seguro Viagem', 'Nike',
  'Nova Era', 'O Boticário', 'O.U.i Paris', 'Oceane', 'Oficina',
  'Olympikus', 'Osklen', 'Outback', 'Oxford', 'Pado', 'PerfectDraft (Ambev)',
  'Petlove', 'Petlove Saúde', 'Petz', 'Piatan Natural', 'Playstation',
  'PneuStore', 'Pontofrio', 'Portal das Malas', 'Portallar', 'Porto Faz',
  'Posthaus', 'Probiótica', 'Puket', 'Qcompra', 'Quem Disse, Berenice?',
  'Quero Passagem', 'Quero-Quero', 'Quintess', 'Renner', 'Rentalcars',
  'Rentcars', 'Reserva', 'Reservecar', 'Riachuelo', 'Richards', 'Salinas',
  "Sam's Club", "Sam's Club - E-commerce", 'Samsonite', 'Seculus',
  'Seguro Residencial MAPFRE', 'Seguro Viagem Bradesco', 'Sephora',
  'Seus Ingressos', 'Shiseido', 'Shoestock', 'Shopee', 'Sioux Seguro Celular',
  'Sixt', 'Speedo', 'Spicy', 'Studio Z', 'SulAmérica Plano Odonto',
  'SulAmérica Seguro Viagem', 'Summerville', 'Supernosso', 'TIM', 'Technos',
  'Thule', 'Tia Sônia', 'Tokio Marine Seguros', 'Top Móveis', 'Travelex',
  'TripChip', 'Trocafy', 'Truss', 'Umbro', 'Under Armour', 'Unidas',
  'Universal Assistance - Seguro Viagem', 'Universal Music', 'VR Collezioni',
  'Viajar', 'Viação Garcia', 'Vivara', 'Vult', 'Wise UP', 'Yvy', 'Zattini',
  'Zee.Dog', 'Zee.Now', 'Zissou', 'Zé Delivery'
];

export default function CompraTurbinada() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createOperation } = useOperations();
  const { 
    formatNumber, 
    formatCurrencyInput, 
    parseCurrency,
    getCurrencySymbol,
  } = useLocalization();
  
  // Fetch credit cards from database
  const { data: creditCards = [] } = useQuery({
    queryKey: ['credit_cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select(`
          *,
          holders(name)
        `)
        .order('card_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  
  const [formData, setFormData] = useState({
    holderId: '',
    holderName: '',
    program: '',
    creditCard: '',
    installments: '1',
    produto: '',
    lojaParceira: '',
    precoProduto: '',
    pontosBonusPorReal: '',
    validadeMonths: 'none',
    destinoProduto: 'uso_proprio',
    dataOperacao: new Date().toISOString().split('T')[0],
    dataBonusMode: 'dias' as 'dias' | 'especifica',
    diasBonus: '45',
    dataBonus: '',
    notes: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate bonus date automatically when using days mode
  useEffect(() => {
    if (formData.dataBonusMode === 'dias' && formData.dataOperacao && formData.diasBonus) {
      const operationDate = new Date(formData.dataOperacao + 'T00:00:00');
      const days = parseInt(formData.diasBonus);
      const bonusDate = addDays(operationDate, days);
      setFormData(prev => ({
        ...prev,
        dataBonus: format(bonusDate, 'yyyy-MM-dd')
      }));
    }
  }, [formData.dataBonusMode, formData.dataOperacao, formData.diasBonus]);

  const precoProdutoNumber = parseCurrency(formData.precoProduto);
  const pontosBonusPorRealNumber = parseFloat(formData.pontosBonusPorReal) || 0;

  // Calculations - Bônus é calculado automaticamente (preço × pontos/R$)
  const totalPontos = precoProdutoNumber * pontosBonusPorRealNumber;
  
  // Custo do milheiro e custo total são zero na compra turbinada
  // pois você está comprando um produto e ganhando os pontos como bônus
  const custoMilheiroBonus = 0;
  const custoTotalMilhas = 0;

  // Validation — cada campo obrigatório vira um item de "pendências" para
  // deixar explícito por que o botão SALVAR fica desabilitado (evita o
  // "botão travado sem explicação" reportado nos testes de UX).
  const produtoMinLength = 5;
  const isProdutoValid = formData.produto.length >= produtoMinLength;

  const missingFields: string[] = [];
  if (!formData.program) missingFields.push('Programa');
  if (!isProdutoValid) missingFields.push(`Produto (mín. ${produtoMinLength} caracteres)`);
  if (!formData.lojaParceira) missingFields.push('Loja parceira');
  if (!(precoProdutoNumber > 0)) missingFields.push('Preço do Produto');
  if (!(pontosBonusPorRealNumber > 0)) missingFields.push('Pontos Bônus/R$');
  if (!formData.dataBonus) missingFields.push('Data do Bônus');
  const isFormValid = missingFields.length === 0;

  const handlePrecoProdutoChange = (value: string) => {
    setFormData({ ...formData, precoProduto: formatCurrencyInput(value) });
  };

  const handleHolderChange = (holderId: string, holderName?: string) => {
    setFormData({ ...formData, holderId, holderName: holderName || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid || !user) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the selected card name for storage
      const selectedCard = (creditCards as CreditCardRow[]).find((card) => card.id === formData.creditCard);
      const cardName = selectedCard ? selectedCard.card_name : undefined;

      // Create the operation
      const operation = await createOperation.mutateAsync({
        type: 'compra_turbinada',
        program: formData.program,
        quantity: Math.floor(totalPontos),
        total_cost: 0, // Custo zero - pontos são bônus da compra do produto
        cost_per_thousand: 0,
        holder_id: formData.holderId || undefined,
        holder_name: formData.holderName || undefined,
        credit_card: cardName,
        installments: parseInt(formData.installments) || 1,
        bonus: pontosBonusPorRealNumber,
        date: formData.dataOperacao,
        notes: `Produto: ${formData.produto} (R$ ${formData.precoProduto}). Loja: ${formData.lojaParceira}. Destino: ${destinoProdutoOptions.find(d => d.value === formData.destinoProduto)?.label}. Data prevista bônus: ${formData.dataBonus}. ${formData.notes || ''}`,
        status: 'pendente',
      });

      // Create the pending bonus entry
      const { error: bonusError } = await supabase
        .from('pending_bonuses')
        .insert({
          user_id: user.id,
          operation_id: operation?.id,
          holder_id: formData.holderId || null,
          holder_name: formData.holderName || null,
          program: formData.program,
          quantity: Math.floor(totalPontos),
          expected_date: formData.dataBonus,
          produto: formData.produto,
          loja: formData.lojaParceira,
          notes: formData.notes || null,
          confirmed: false,
        });

      if (bonusError) {
        logger.error('Error creating pending bonus:', bonusError);
        toast.error('Operação criada, mas houve erro ao registrar bônus pendente');
      } else {
        toast.success('Compra turbinada registrada com bônus pendente');
      }

      navigate('/dashboard');
    } catch (error) {
      logger.error('Error submitting:', error);
      toast.error('Erro ao registrar operação');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Compra Turbinada">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Operação"
          icon={<Rocket className="h-5 w-5" />}
          title="Compra Turbinada"
          subtitle="Compra com bônus: inclui transferência bonificada e promoções"
        />

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Linha 1 - Titular */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Titular/Conta da Operação</Label>
                <HolderSelect
                  value={formData.holderId}
                  onValueChange={handleHolderChange}
                />
              </div>

              {/* Linha 2 - Programa */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Programa *</Label>
                <ProgramSelect
                  value={formData.program}
                  onValueChange={(value) => setFormData({ ...formData, program: value })}
                  placeholder="Selecione o programa"
                />
              </div>

              {/* Linha 3 - Cartão e Parcelas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Cartão de Crédito</Label>
                  <Select
                    value={formData.creditCard}
                    onValueChange={(value) => setFormData({ ...formData, creditCard: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cartão">
                        {formData.creditCard && (creditCards as CreditCardRow[]).find((card) => card.id === formData.creditCard) && (
                          <div className="flex items-center gap-2">
                            <CardBrandIcon brand={getBrandFromName((creditCards as CreditCardRow[]).find((card) => card.id === formData.creditCard)?.card_name || '')} size="sm" />
                            <span>{(creditCards as CreditCardRow[]).find((card) => card.id === formData.creditCard)?.card_name}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span>Nenhum cartão</span>
                        </div>
                      </SelectItem>
                      {(creditCards as CreditCardRow[]).map((card) => {
                        const brand = getBrandFromName(card.card_name || '');
                        const holderName = card.holders?.name;
                        const displayName = holderName 
                          ? `${card.card_name} - ${holderName}`
                          : card.card_name;
                        return (
                          <SelectItem key={card.id} value={card.id}>
                            <div className="flex items-center gap-2">
                              <CardBrandIcon brand={brand} size="sm" />
                              <span>{displayName}</span>
                              {card.last_four_digits && (
                                <span className="text-muted-foreground">•••• {card.last_four_digits}</span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Parcelas</Label>
                  <Select
                    value={formData.installments}
                    onValueChange={(value) => setFormData({ ...formData, installments: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}x
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linha 3 - Produto e Loja */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Produto *</Label>
                  <Input
                    type="text"
                    placeholder="Nome do produto"
                    value={formData.produto}
                    onChange={(e) => {
                      setFormData({ ...formData, produto: e.target.value });
                      setTouched(prev => ({ ...prev, produto: true }));
                    }}
                    onBlur={() => setTouched(prev => ({ ...prev, produto: true }))}
                    className={touched.produto && !isProdutoValid ? 'border-destructive' : ''}
                  />
                  {touched.produto && formData.produto.length > 0 && !isProdutoValid && (
                    <span className="text-xs text-destructive">Tamanho mínimo de {produtoMinLength} caracteres.</span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Loja parceira *</Label>
                  <Select
                    value={formData.lojaParceira}
                    onValueChange={(value) => setFormData({ ...formData, lojaParceira: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a loja" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {lojasParceiras.map((loja) => (
                        <SelectItem key={loja} value={loja}>
                          {loja}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linha 4 - Preço, Pontos/R$, Bônus, Validade */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Preço do Produto *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formData.precoProduto}
                      onChange={(e) => handlePrecoProdutoChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Pontos Bônus/R$ *</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formData.pontosBonusPorReal}
                      onChange={(e) => setFormData({ ...formData, pontosBonusPorReal: e.target.value.replace(/\D/g, '') })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Bônus</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={totalPontos > 0 ? formatNumber(Math.floor(totalPontos)) : ''}
                      placeholder="0"
                      className="bg-muted"
                      readOnly
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">#</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Validade (Meses)</Label>
                  <Select
                    value={formData.validadeMonths}
                    onValueChange={(value) => setFormData({ ...formData, validadeMonths: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {validadeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linha 5 - Destino e Custo Milheiro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Destino do Produto</Label>
                  <Select
                    value={formData.destinoProduto}
                    onValueChange={(value) => setFormData({ ...formData, destinoProduto: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {destinoProdutoOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Custo Milheiro (Bônus)</Label>
                  <div className="relative">
                    <Input
                      value="0,00"
                      className="bg-muted"
                      readOnly
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  </div>
                </div>
              </div>

              {/* Linha 6 - Custo Total e Data Operação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Custo Total R$</Label>
                  <div className="relative">
                    <Input
                      value="0,00"
                      className="bg-muted"
                      readOnly
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Data Operação</Label>
                  <Input
                    type="date"
                    value={formData.dataOperacao}
                    onChange={(e) => setFormData({ ...formData, dataOperacao: e.target.value })}
                  />
                </div>
              </div>

              {/* Linha 7 - Data do Bônus */}
              <div className="space-y-4">
                <Label className="text-muted-foreground">Data do Bônus *</Label>
                <RadioGroup
                  value={formData.dataBonusMode}
                  onValueChange={(value: 'dias' | 'especifica') => setFormData({ ...formData, dataBonusMode: value })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dias" id="dias" />
                    <Label htmlFor="dias" className="flex items-center gap-2 cursor-pointer">
                      <CalendarDays className="h-4 w-4" />
                      Por número de dias
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="especifica" id="especifica" />
                    <Label htmlFor="especifica" className="flex items-center gap-2 cursor-pointer">
                      <Calendar className="h-4 w-4" />
                      Data específica
                    </Label>
                  </div>
                </RadioGroup>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.dataBonusMode === 'dias' ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Dias para o bônus cair</Label>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          placeholder="Ex: 45"
                          value={formData.diasBonus}
                          onChange={(e) => setFormData({ ...formData, diasBonus: e.target.value })}
                        />
                        <span className="text-xs text-muted-foreground">Digite o número de dias (ex: 30, 45, 60)</span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Data prevista (calculada)</Label>
                        <Input
                          type="date"
                          value={formData.dataBonus}
                          className="bg-muted"
                          readOnly
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Data específica do bônus</Label>
                      <Input
                        type="date"
                        value={formData.dataBonus}
                        onChange={(e) => setFormData({ ...formData, dataBonus: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Preview pontos */}
              {totalPontos > 0 && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Total de pontos a receber:</p>
                  <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-primary">
                    {formatNumber(Math.floor(totalPontos))} pontos
                  </p>
                  {formData.dataBonus && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Previsão de crédito: <span className="font-medium font-mono tabular-nums">{new Date(formData.dataBonus + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Observações */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Observações:</Label>
                <Textarea
                  placeholder="Adicione observações..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Botões */}
              <div className="flex flex-col items-end gap-2">
                {!isFormValid && missingFields.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    Preencha para salvar:{' '}
                    <span className="text-foreground/80">{missingFields.join(', ')}</span>
                  </p>
                )}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    CANCELAR
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !isFormValid}
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    SALVAR
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
