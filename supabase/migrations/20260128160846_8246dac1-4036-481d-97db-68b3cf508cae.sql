-- Índices compostos para melhor performance em consultas frequentes

-- Operations: ordenação por data, filtros por programa e tipo
CREATE INDEX IF NOT EXISTS idx_operations_user_date ON operations(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_operations_user_program ON operations(user_id, program);
CREATE INDEX IF NOT EXISTS idx_operations_user_type ON operations(user_id, type);

-- Program balances: lookup rápido por programa
CREATE INDEX IF NOT EXISTS idx_program_balances_user_program ON program_balances(user_id, program);

-- Club subscriptions: filtro por assinaturas ativas
CREATE INDEX IF NOT EXISTS idx_club_subscriptions_user_active ON club_subscriptions(user_id, active);

-- Travel tickets: filtro por status
CREATE INDEX IF NOT EXISTS idx_travel_tickets_user_status ON travel_tickets(user_id, status);

-- Travel clients: busca por nome
CREATE INDEX IF NOT EXISTS idx_travel_clients_user_name ON travel_clients(user_id, name);

-- Trigger de validação para operations (substituindo CHECK constraints que podem falhar em restaurações)
CREATE OR REPLACE FUNCTION validate_operation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than 0';
  END IF;
  
  IF NEW.total_cost IS NOT NULL AND NEW.total_cost < 0 THEN
    RAISE EXCEPTION 'Total cost cannot be negative';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Aplicar trigger de validação
DROP TRIGGER IF EXISTS trigger_validate_operation ON operations;
CREATE TRIGGER trigger_validate_operation
  BEFORE INSERT OR UPDATE ON operations
  FOR EACH ROW
  EXECUTE FUNCTION validate_operation();