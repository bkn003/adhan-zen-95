
CREATE TABLE public.shop_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reviewer_name text,
  rating integer NOT NULL,
  comment text,
  verified_buyer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);
GRANT SELECT ON public.shop_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_reviews TO authenticated;
GRANT ALL ON public.shop_reviews TO service_role;
ALTER TABLE public.shop_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads shop reviews" ON public.shop_reviews FOR SELECT USING (true);
CREATE POLICY "Users write own review" ON public.shop_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own review" ON public.shop_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own review" ON public.shop_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.shop_review_validate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN RAISE EXCEPTION 'Rating must be 1 to 5'; END IF;
  IF length(coalesce(NEW.comment,'')) > 1000 THEN RAISE EXCEPTION 'Comment too long'; END IF;
  NEW.verified_buyer := EXISTS (SELECT 1 FROM shop_orders WHERE shop_id = NEW.shop_id AND user_id = NEW.user_id AND status = 'completed');
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER shop_review_validate BEFORE INSERT OR UPDATE ON public.shop_reviews FOR EACH ROW EXECUTE FUNCTION public.shop_review_validate();

CREATE TABLE public.shop_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_order_events TO authenticated;
GRANT ALL ON public.shop_order_events TO service_role;
ALTER TABLE public.shop_order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer or shop owner reads events" ON public.shop_order_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM shop_orders o JOIN shops s ON s.id = o.shop_id WHERE o.id = order_id AND (o.user_id = auth.uid() OR s.owner_user_id = auth.uid()))
);

CREATE OR REPLACE FUNCTION public.shop_order_log_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO shop_order_events(order_id, status, note) VALUES (NEW.id, NEW.status, NULL);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO shop_order_events(order_id, status, note) VALUES (NEW.id, NEW.status, NEW.status_note);
  ELSIF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO shop_order_events(order_id, status, note) VALUES (NEW.id, 'payment_' || NEW.payment_status, NULL);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER shop_order_log_event AFTER INSERT OR UPDATE ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.shop_order_log_event();

-- Stock goes down when an order item is added
CREATE OR REPLACE FUNCTION public.shop_order_item_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  SELECT * INTO p FROM shop_products WHERE id = NEW.product_id FOR UPDATE;
  IF p.id IS NOT NULL AND p.track_stock THEN
    IF p.stock_qty < NEW.quantity THEN RAISE EXCEPTION 'Only % of % left in stock', p.stock_qty, p.name; END IF;
    UPDATE shop_products SET stock_qty = stock_qty - NEW.quantity,
      is_available = CASE WHEN stock_qty - NEW.quantity <= 0 THEN false ELSE is_available END
      WHERE id = p.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER shop_order_item_stock BEFORE INSERT ON public.shop_order_items FOR EACH ROW EXECUTE FUNCTION public.shop_order_item_stock();

ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_orders;

-- TEST SHOPS (delete later: DELETE FROM shops WHERE name LIKE '[TEST]%')
DO $$
DECLARE loc record; sid uuid; owner uuid := '615b427e-96f7-43b2-ac39-3d591404eeaf'; n int := 0;
BEGIN
  FOR loc IN SELECT id, mosque_name, district, latitude, longitude FROM locations WHERE is_visible LOOP
    n := n + 1;
    INSERT INTO shops(owner_user_id,name,owner_name,phone,whatsapp,category,description,address,area,latitude,longitude,nearest_location_id,timings,delivery_available,pickup_available,min_order_amount,halal_declared,status,approved_by,approved_at,upi_id,upi_payee_name,upi_enabled)
    VALUES (owner,'[TEST] Noor Halal Meat '||n,'Test Owner','9876543210','9876543210','Meat & Poultry','Test shop near '||loc.mosque_name,'Near '||loc.mosque_name,loc.district,loc.latitude+0.002,loc.longitude+0.002,loc.id,'7 AM - 9 PM',true,true,0,true,'approved',owner,now(),'test@upi','Noor Halal Meat',true)
    RETURNING id INTO sid;
    INSERT INTO shop_products(shop_id,name,price,mrp,unit,category,stock_qty,track_stock,display_order) VALUES
      (sid,'Chicken (curry cut)',220,250,'1 kg','Meat',40,true,1),
      (sid,'Mutton',780,850,'1 kg','Meat',15,true,2),
      (sid,'Eggs',84,90,'12 pcs','Eggs',0,false,3);
    INSERT INTO shops(owner_user_id,name,owner_name,phone,whatsapp,category,description,address,area,latitude,longitude,nearest_location_id,timings,delivery_available,pickup_available,min_order_amount,halal_declared,status,approved_by,approved_at,upi_id,upi_payee_name,upi_enabled)
    VALUES (owner,'[TEST] Madina Dates & Attar '||n,'Test Owner','9123456780','9123456780','Dates & Dry Fruits','Test shop near '||loc.mosque_name,'Near '||loc.mosque_name,loc.district,loc.latitude-0.002,loc.longitude-0.001,loc.id,'10 AM - 10 PM',false,true,100,true,'approved',owner,now(),'test@upi','Madina Dates',true)
    RETURNING id INTO sid;
    INSERT INTO shop_products(shop_id,name,price,mrp,unit,category,stock_qty,track_stock,display_order) VALUES
      (sid,'Ajwa dates',650,700,'500 g','Dates',20,true,1),
      (sid,'Medjool dates',480,520,'500 g','Dates',25,true,2),
      (sid,'Oud attar',350,400,'6 ml','Attar',10,true,3);
  END LOOP;
END $$;
