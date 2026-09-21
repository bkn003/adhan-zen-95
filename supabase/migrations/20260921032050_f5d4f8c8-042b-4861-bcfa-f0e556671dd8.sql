ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS mrp numeric,
  ADD COLUMN IF NOT EXISTS stock_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT false;

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS whatsapp text;
