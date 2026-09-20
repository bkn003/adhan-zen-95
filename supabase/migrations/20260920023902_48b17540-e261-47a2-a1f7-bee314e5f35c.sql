ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS upi_payee_name text,
  ADD COLUMN IF NOT EXISTS upi_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_marked_at timestamptz;