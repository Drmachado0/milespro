-- Atomic boundary for mutations that affect a booking, its client totals and
-- the loyalty-program ledger. Both functions run as the authenticated caller,
-- so existing RLS remains authoritative.

CREATE OR REPLACE FUNCTION public.create_travel_booking(
  p_booking_type text,
  p_booking jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_table_name text;
  v_note_subject text;
  v_columns text;
  v_values text;
  v_booking jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  v_table_name := CASE p_booking_type
    WHEN 'ticket' THEN 'travel_tickets'
    WHEN 'hotel' THEN 'travel_hotel_reservations'
    WHEN 'car' THEN 'travel_car_rentals'
    WHEN 'cruise' THEN 'travel_cruises'
    ELSE NULL
  END;
  v_note_subject := CASE p_booking_type
    WHEN 'ticket' THEN 'passagem'
    WHEN 'hotel' THEN 'reserva de hotel'
    WHEN 'car' THEN 'aluguel de carro'
    WHEN 'cruise' THEN 'cruzeiro'
  END;

  IF v_table_name IS NULL THEN
    RAISE EXCEPTION 'unsupported booking type' USING ERRCODE = '22023';
  END IF;
  IF p_booking IS NULL OR jsonb_typeof(p_booking) <> 'object' OR p_booking = '{}'::jsonb THEN
    RAISE EXCEPTION 'booking must be a non-empty object' USING ERRCODE = '22023';
  END IF;
  IF p_booking ?| ARRAY['id', 'user_id', 'created_at', 'updated_at'] THEN
    RAISE EXCEPTION 'immutable booking field' USING ERRCODE = '22023';
  END IF;
  IF p_booking->>'client_id' IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.travel_clients
    WHERE id = (p_booking->>'client_id')::uuid AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'client not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT
    string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum),
    string_agg(
      format(
        'CASE WHEN $1->%L = ''null''::jsonb THEN NULL ELSE ($1->>%L)::%s END',
        a.attname,
        a.attname,
        pg_catalog.format_type(a.atttypid, a.atttypmod)
      ),
      ', ' ORDER BY a.attnum
    )
  INTO v_columns, v_values
  FROM pg_catalog.pg_attribute a
  JOIN LATERAL jsonb_object_keys(p_booking) key(name) ON key.name = a.attname
  WHERE a.attrelid = format('public.%I', v_table_name)::regclass
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND a.attname NOT IN ('id', 'user_id', 'created_at', 'updated_at');

  IF v_columns IS NULL OR (
    SELECT count(*) FROM jsonb_object_keys(p_booking)
  ) <> (
    SELECT count(*)
    FROM pg_catalog.pg_attribute a
    JOIN LATERAL jsonb_object_keys(p_booking) key(name) ON key.name = a.attname
    WHERE a.attrelid = format('public.%I', v_table_name)::regclass
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.attname NOT IN ('id', 'user_id', 'created_at', 'updated_at')
  ) THEN
    RAISE EXCEPTION 'unknown or immutable booking field' USING ERRCODE = '22023';
  END IF;

  EXECUTE format(
    'INSERT INTO public.%I (user_id, %s) VALUES ($2, %s) RETURNING to_jsonb(%I)',
    v_table_name,
    v_columns,
    v_values,
    v_table_name
  ) INTO v_booking USING p_booking, v_user_id;

  IF v_booking->>'client_id' IS NOT NULL THEN
    UPDATE public.travel_clients
    SET miles_balance = GREATEST(0, miles_balance - COALESCE((v_booking->>'miles_used')::integer, 0)),
        total_miles_used = total_miles_used + COALESCE((v_booking->>'miles_used')::integer, 0),
        total_spent_brl = total_spent_brl + COALESCE((v_booking->>'total_cost_brl')::numeric, 0)
    WHERE id = (v_booking->>'client_id')::uuid
      AND user_id = v_user_id;
  END IF;

  IF v_booking->>'miles_program' IS NOT NULL
     AND COALESCE((v_booking->>'miles_used')::integer, 0) > 0
     AND NOT (p_booking_type = 'ticket' AND COALESCE((v_booking->>'third_party_miles')::boolean, false)) THEN
    INSERT INTO public.operations (
      user_id, program, type, quantity, status, date, notes, total_cost, cost_per_thousand
    ) VALUES (
      v_user_id,
      v_booking->>'miles_program',
      'resgate'::public.operation_type,
      (v_booking->>'miles_used')::integer,
      'confirmado'::public.operation_status,
      CURRENT_DATE,
      'Emissão - ' || v_note_subject,
      0,
      0
    );
  END IF;

  RETURN v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_travel_booking(
  p_booking_type text,
  p_booking_id uuid,
  p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_table_name text;
  v_old jsonb;
  v_new jsonb;
  v_assignments text;
  v_miles_diff numeric;
  v_cost_diff numeric;
  v_old_program text;
  v_new_program text;
  v_old_ledger_miles integer;
  v_new_ledger_miles integer;
  v_note_subject text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  v_table_name := CASE p_booking_type
    WHEN 'ticket' THEN 'travel_tickets'
    WHEN 'hotel' THEN 'travel_hotel_reservations'
    WHEN 'car' THEN 'travel_car_rentals'
    WHEN 'cruise' THEN 'travel_cruises'
    ELSE NULL
  END;

  v_note_subject := CASE p_booking_type
    WHEN 'ticket' THEN 'passagem'
    WHEN 'hotel' THEN 'reserva de hotel'
    WHEN 'car' THEN 'aluguel de carro'
    WHEN 'cruise' THEN 'cruzeiro'
  END;

  IF v_table_name IS NULL THEN
    RAISE EXCEPTION 'unsupported booking type' USING ERRCODE = '22023';
  END IF;
  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' OR p_updates = '{}'::jsonb THEN
    RAISE EXCEPTION 'updates must be a non-empty object' USING ERRCODE = '22023';
  END IF;
  IF p_updates ?| ARRAY['id', 'user_id', 'client_id', 'created_at', 'updated_at'] THEN
    RAISE EXCEPTION 'immutable booking field' USING ERRCODE = '22023';
  END IF;

  EXECUTE format(
    'SELECT to_jsonb(t) FROM public.%I t WHERE id = $1 AND user_id = $2 FOR UPDATE',
    v_table_name
  ) INTO v_old USING p_booking_id, v_user_id;

  IF v_old IS NULL THEN
    RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT string_agg(
    format(
      '%I = CASE WHEN $1->%L = ''null''::jsonb THEN NULL ELSE ($1->>%L)::%s END',
      a.attname,
      a.attname,
      a.attname,
      pg_catalog.format_type(a.atttypid, a.atttypmod)
    ),
    ', '
  )
  INTO v_assignments
  FROM pg_catalog.pg_attribute a
  JOIN LATERAL jsonb_object_keys(p_updates) key(name) ON key.name = a.attname
  WHERE a.attrelid = format('public.%I', v_table_name)::regclass
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND a.attname NOT IN ('id', 'user_id', 'client_id', 'created_at', 'updated_at');

  IF v_assignments IS NULL OR (
    SELECT count(*) FROM jsonb_object_keys(p_updates)
  ) <> (
    SELECT count(*)
    FROM pg_catalog.pg_attribute a
    JOIN LATERAL jsonb_object_keys(p_updates) key(name) ON key.name = a.attname
    WHERE a.attrelid = format('public.%I', v_table_name)::regclass
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.attname NOT IN ('id', 'user_id', 'client_id', 'created_at', 'updated_at')
  ) THEN
    RAISE EXCEPTION 'unknown or immutable booking field' USING ERRCODE = '22023';
  END IF;

  EXECUTE format(
    'UPDATE public.%I t SET %s WHERE id = $2 AND user_id = $3 RETURNING to_jsonb(t)',
    v_table_name,
    v_assignments
  ) INTO v_new USING p_updates, p_booking_id, v_user_id;

  v_miles_diff := COALESCE((v_new->>'miles_used')::numeric, 0)
    - COALESCE((v_old->>'miles_used')::numeric, 0);
  v_cost_diff := COALESCE((v_new->>'total_cost_brl')::numeric, 0)
    - COALESCE((v_old->>'total_cost_brl')::numeric, 0);

  IF (v_miles_diff <> 0 OR v_cost_diff <> 0) AND v_old->>'client_id' IS NOT NULL THEN
    UPDATE public.travel_clients
    SET miles_balance = GREATEST(0, miles_balance - v_miles_diff::integer),
        total_miles_used = GREATEST(0, total_miles_used + v_miles_diff::integer),
        total_spent_brl = GREATEST(0, total_spent_brl + v_cost_diff)
    WHERE id = (v_old->>'client_id')::uuid
      AND user_id = v_user_id;
  END IF;

  v_old_program := v_old->>'miles_program';
  v_new_program := v_new->>'miles_program';
  v_old_ledger_miles := CASE
    WHEN v_old_program IS NULL OR (p_booking_type = 'ticket' AND COALESCE((v_old->>'third_party_miles')::boolean, false)) THEN 0
    ELSE COALESCE((v_old->>'miles_used')::integer, 0)
  END;
  v_new_ledger_miles := CASE
    WHEN v_new_program IS NULL OR (p_booking_type = 'ticket' AND COALESCE((v_new->>'third_party_miles')::boolean, false)) THEN 0
    ELSE COALESCE((v_new->>'miles_used')::integer, 0)
  END;

  IF v_old_program IS NOT DISTINCT FROM v_new_program THEN
    v_miles_diff := v_new_ledger_miles - v_old_ledger_miles;
  ELSE
    IF v_old_ledger_miles > 0 THEN
      INSERT INTO public.operations (
        user_id, program, type, quantity, status, date, notes, total_cost, cost_per_thousand
      ) VALUES (
        v_user_id, v_old_program, 'entrada_manual'::public.operation_type,
        v_old_ledger_miles, 'confirmado'::public.operation_status, CURRENT_DATE,
        'Ajuste - Troca de programa em ' || v_note_subject, 0, 0
      );
    END IF;
    IF v_new_ledger_miles > 0 THEN
      INSERT INTO public.operations (
        user_id, program, type, quantity, status, date, notes, total_cost, cost_per_thousand
      ) VALUES (
        v_user_id, v_new_program, 'resgate'::public.operation_type,
        v_new_ledger_miles, 'confirmado'::public.operation_status, CURRENT_DATE,
        'Ajuste - Troca de programa em ' || v_note_subject, 0, 0
      );
    END IF;
    v_miles_diff := 0;
  END IF;

  IF v_miles_diff <> 0 AND v_new_program IS NOT NULL THEN
    INSERT INTO public.operations (
      user_id, program, type, quantity, status, date, notes, total_cost, cost_per_thousand
    ) VALUES (
      v_user_id,
      v_new_program,
      (CASE WHEN v_miles_diff > 0 THEN 'resgate' ELSE 'entrada_manual' END)::public.operation_type,
      abs(v_miles_diff)::integer,
      'confirmado'::public.operation_status,
      CURRENT_DATE,
      CASE WHEN v_miles_diff > 0 THEN 'Ajuste - Aumento de milhas em ' ELSE 'Ajuste - Redução de milhas em ' END || v_note_subject,
      0,
      0
    );
  END IF;

  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_travel_booking(
  p_booking_type text,
  p_booking_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_table_name text;
  v_booking jsonb;
  v_note_subject text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  v_table_name := CASE p_booking_type
    WHEN 'ticket' THEN 'travel_tickets'
    WHEN 'hotel' THEN 'travel_hotel_reservations'
    WHEN 'car' THEN 'travel_car_rentals'
    WHEN 'cruise' THEN 'travel_cruises'
    ELSE NULL
  END;
  v_note_subject := CASE p_booking_type
    WHEN 'ticket' THEN 'passagem'
    WHEN 'hotel' THEN 'reserva de hotel'
    WHEN 'car' THEN 'aluguel de carro'
    WHEN 'cruise' THEN 'cruzeiro'
  END;

  IF v_table_name IS NULL THEN
    RAISE EXCEPTION 'unsupported booking type' USING ERRCODE = '22023';
  END IF;

  EXECUTE format(
    'SELECT to_jsonb(t) FROM public.%I t WHERE id = $1 AND user_id = $2 FOR UPDATE',
    v_table_name
  ) INTO v_booking USING p_booking_id, v_user_id;

  IF v_booking IS NULL THEN
    RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking->>'client_id' IS NOT NULL THEN
    UPDATE public.travel_clients
    SET miles_balance = miles_balance + COALESCE((v_booking->>'miles_used')::integer, 0),
        total_miles_used = GREATEST(0, total_miles_used - COALESCE((v_booking->>'miles_used')::integer, 0)),
        total_spent_brl = GREATEST(0, total_spent_brl - COALESCE((v_booking->>'total_cost_brl')::numeric, 0))
    WHERE id = (v_booking->>'client_id')::uuid
      AND user_id = v_user_id;
  END IF;

  IF v_booking->>'miles_program' IS NOT NULL
     AND COALESCE((v_booking->>'miles_used')::integer, 0) > 0
     AND NOT (p_booking_type = 'ticket' AND COALESCE((v_booking->>'third_party_miles')::boolean, false)) THEN
    INSERT INTO public.operations (
      user_id, program, type, quantity, status, date, notes, total_cost, cost_per_thousand
    ) VALUES (
      v_user_id,
      v_booking->>'miles_program',
      'entrada_manual'::public.operation_type,
      (v_booking->>'miles_used')::integer,
      'confirmado'::public.operation_status,
      CURRENT_DATE,
      'Estorno - Cancelamento de ' || v_note_subject,
      0,
      0
    );
  END IF;

  EXECUTE format(
    'DELETE FROM public.%I WHERE id = $1 AND user_id = $2',
    v_table_name
  ) USING p_booking_id, v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_travel_booking(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_travel_booking(text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_travel_booking(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_travel_booking(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_travel_booking(text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_travel_booking(text, uuid) TO authenticated;
