REVOKE EXECUTE ON FUNCTION public.shop_review_validate() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.shop_order_log_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.shop_order_item_stock() FROM PUBLIC, anon, authenticated;