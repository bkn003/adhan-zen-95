-- ============================ SHOPS ============================
CREATE TABLE public.shops (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  owner_name text NOT NULL,
  phone text NOT NULL,
  email text,
  category text NOT NULL DEFAULT 'other',
  description text,
  address text,
  area text,
  latitude numeric,
  longitude numeric,
  map_link text,
  nearest_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  timings text,
  delivery_available boolean NOT NULL DEFAULT false,
  pickup_available boolean NOT NULL DEFAULT true,
  min_order_amount numeric NOT NULL DEFAULT 0,
  halal_declared boolean NOT NULL DEFAULT false,
  halal_certificate_path text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shops_status ON public.shops(status);
CREATE INDEX idx_shops_owner ON public.shops(owner_user_id);
CREATE INDEX idx_shops_nearest ON public.shops(nearest_location_id);

GRANT SELECT ON public.shops TO anon;
GRANT SELECT, INSERT, UPDATE ON public.shops TO authenticated;
GRANT ALL ON public.shops TO service_role;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.shops_marketplace_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT s.value FROM public.app_settings s WHERE s.key = 'shops_enabled'), 'false') = 'true';
$$;

CREATE POLICY "Public can view approved shops"
ON public.shops FOR SELECT
USING (status = 'approved' AND public.shops_marketplace_enabled());

CREATE POLICY "Owners can view their own shop"
ON public.shops FOR SELECT TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can apply for a shop"
ON public.shops FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid() AND status = 'pending' AND halal_declared = true);

CREATE POLICY "Owners can update their own shop"
ON public.shops FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE TRIGGER trg_shops_updated BEFORE UPDATE ON public.shops
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================ PRODUCTS ============================
CREATE TABLE public.shop_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  unit text,
  photo_path text,
  category text,
  is_available boolean NOT NULL DEFAULT true,
  is_hidden boolean NOT NULL DEFAULT false,
  report_count integer NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_products_shop ON public.shop_products(shop_id);

GRANT SELECT ON public.shop_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view visible products of approved shops"
ON public.shop_products FOR SELECT
USING (
  is_hidden = false
  AND public.shops_marketplace_enabled()
  AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.status = 'approved')
);

CREATE POLICY "Owners can view their products"
ON public.shop_products FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_user_id = auth.uid()));

CREATE POLICY "Owners can insert their products"
ON public.shop_products FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_user_id = auth.uid() AND s.status = 'approved'));

CREATE POLICY "Owners can update their products"
ON public.shop_products FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_user_id = auth.uid()));

CREATE POLICY "Owners can delete their products"
ON public.shop_products FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_user_id = auth.uid()));

CREATE TRIGGER trg_shop_products_updated BEFORE UPDATE ON public.shop_products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================ PRODUCT REPORTS ============================
CREATE TABLE public.shop_product_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.shop_product_reports TO authenticated;
GRANT ALL ON public.shop_product_reports TO service_role;
ALTER TABLE public.shop_product_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
ON public.shop_product_reports FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.report_shop_product(p_product_id uuid, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.shop_product_reports (product_id, user_id, reason)
  VALUES (p_product_id, v_uid, left(coalesce(p_reason, ''), 300))
  ON CONFLICT (product_id, user_id) DO NOTHING;

  SELECT count(*) INTO v_count FROM public.shop_product_reports WHERE product_id = p_product_id;

  UPDATE public.shop_products
     SET report_count = v_count,
         is_hidden = (v_count >= 3)
   WHERE id = p_product_id;

  RETURN true;
END;
$$;

-- ============================ ORDERS ============================
CREATE TABLE public.shop_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text,
  fulfilment text NOT NULL DEFAULT 'pickup',
  address text,
  note text,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'placed',
  status_note text,
  marketing_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_orders_shop ON public.shop_orders(shop_id);
CREATE INDEX idx_shop_orders_user ON public.shop_orders(user_id);

GRANT SELECT, INSERT, UPDATE ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own orders"
ON public.shop_orders FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Shop owners can view orders for their shop"
ON public.shop_orders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_user_id = auth.uid()));

CREATE POLICY "Buyers can place their own orders"
ON public.shop_orders FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'placed'
  AND public.shops_marketplace_enabled()
  AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.status = 'approved')
);

CREATE POLICY "Buyers can cancel their own orders"
ON public.shop_orders FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Shop owners can update orders for their shop"
ON public.shop_orders FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_user_id = auth.uid()));

CREATE TRIGGER trg_shop_orders_updated BEFORE UPDATE ON public.shop_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================ ORDER ITEMS ============================
CREATE TABLE public.shop_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.shop_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_order_items_order ON public.shop_order_items(order_id);

GRANT SELECT, INSERT ON public.shop_order_items TO authenticated;
GRANT ALL ON public.shop_order_items TO service_role;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order parties can view items"
ON public.shop_order_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.shop_orders o
  LEFT JOIN public.shops s ON s.id = o.shop_id
  WHERE o.id = order_id AND (o.user_id = auth.uid() OR s.owner_user_id = auth.uid())
));

CREATE POLICY "Buyers can add items to their own order"
ON public.shop_order_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.shop_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- ============================ APPROVERS ============================
CREATE TABLE public.shop_approvers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_shop_approvers_unique ON public.shop_approvers(user_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT ON public.shop_approvers TO authenticated;
GRANT ALL ON public.shop_approvers TO service_role;
ALTER TABLE public.shop_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approvers can see their own grants"
ON public.shop_approvers FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- ============================ MASTER SWITCH ============================
INSERT INTO public.app_settings (key, value)
VALUES ('shops_enabled', 'false')
ON CONFLICT (key) DO NOTHING;