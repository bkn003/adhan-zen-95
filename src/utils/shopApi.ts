// Halal marketplace client API.
//
// Browsing/ordering goes straight to Supabase (RLS keeps it honest: only
// approved, unpaused shops and visible products are readable, and only while
// the `shops_enabled` master switch is on). Anything privileged — signed media
// URLs, the review queue, approver grants, the campaign list — goes through the
// `shop-admin` edge function which validates the caller's JWT.
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FN_URL = `${SUPABASE_URL}/functions/v1/shop-admin`;

export const SHOP_CATEGORIES = [
  'Groceries',
  'Meat & Poultry',
  'Bakery',
  'Restaurant',
  'Dates & Dry Fruits',
  'Attar & Gifts',
  'Books',
  'Clothing',
  'Other',
] as const;

export const ORDER_STATUSES = ['placed', 'confirmed', 'ready', 'completed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Shop {
  id: string;
  owner_user_id: string;
  name: string;
  owner_name: string;
  phone: string;
  email: string | null;
  category: string;
  description: string | null;
  address: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  map_link: string | null;
  nearest_location_id: string | null;
  timings: string | null;
  delivery_available: boolean;
  pickup_available: boolean;
  min_order_amount: number;
  upi_id: string | null;
  upi_payee_name: string | null;
  upi_enabled: boolean;
  halal_declared: boolean;
  halal_certificate_path: string | null;

  status: string;
  rejection_reason: string | null;
  created_at: string;
  locations?: { mosque_name: string; district: string } | null;
}

export interface ShopProduct {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  photo_path: string | null;
  category: string | null;
  is_available: boolean;
  is_hidden: boolean;
  report_count: number;
  display_order: number;
}

export interface ShopOrder {
  id: string;
  shop_id: string;
  user_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  fulfilment: string;
  address: string | null;
  note: string | null;
  total_amount: number;
  status: string;
  status_note: string | null;
  marketing_consent: boolean;
  payment_method: string;
  payment_status: string;
  created_at: string;
  shops?: { name: string; phone: string; address: string | null } | null;
  shop_order_items?: OrderItem[];

}

export interface OrderItem {
  id?: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
}

/** POST a shop-admin action with the caller's session (anon key when signed out). */
export async function shopCall<T = any>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${data.session?.access_token ?? ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.error || 'Request failed');
  return json as T;
}

// ---------------------------------------------------------------- media URLs
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const MEDIA_TTL_MS = 55 * 60 * 1000;

/** Short-lived signed URLs for private shop media, cached per path. */
export async function getShopMediaUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of paths.filter(Boolean)) {
    const hit = urlCache.get(p);
    if (hit && hit.expiresAt > now) out[p] = hit.url;
    else missing.push(p);
  }
  if (missing.length === 0) return out;
  try {
    const { urls } = await shopCall<{ urls: Record<string, string> }>('get_media_urls', {
      paths: missing,
    });
    const exp = Date.now() + MEDIA_TTL_MS;
    for (const [path, url] of Object.entries(urls ?? {})) {
      urlCache.set(path, { url, expiresAt: exp });
      out[path] = url;
    }
  } catch (e) {
    console.warn('shop media urls failed', e);
  }
  return out;
}

// ------------------------------------------------------------------ browsing
export async function isMarketplaceEnabled(): Promise<boolean> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'shops_enabled')
    .maybeSingle();
  return (data?.value ?? 'false') === 'true';
}

export async function listPublicShops(): Promise<Shop[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('*, locations:nearest_location_id(mosque_name, district)')
    .eq('status', 'approved')
    .order('name');
  if (error) throw error;
  return (data ?? []) as unknown as Shop[];
}

export async function getShop(shopId: string): Promise<Shop | null> {
  const { data } = await supabase
    .from('shops')
    .select('*, locations:nearest_location_id(mosque_name, district)')
    .eq('id', shopId)
    .maybeSingle();
  return (data as unknown as Shop) ?? null;
}

export async function listShopProducts(shopId: string): Promise<ShopProduct[]> {
  const { data, error } = await supabase
    .from('shop_products')
    .select('*')
    .eq('shop_id', shopId)
    .order('display_order')
    .order('name');
  if (error) throw error;
  return (data ?? []) as unknown as ShopProduct[];
}

export async function reportProduct(productId: string, reason: string) {
  const { error } = await supabase.rpc('report_shop_product', {
    p_product_id: productId,
    p_reason: reason,
  });
  if (error) throw error;
}

// -------------------------------------------------------------------- orders
export interface PlaceOrderInput {
  shopId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  fulfilment: 'pickup' | 'delivery';
  address?: string;
  note?: string;
  marketingConsent: boolean;
  /** 'upi' when the customer pays the shop's UPI ID now, 'cash' on handover. */
  paymentMethod?: 'cash' | 'upi';
  items: OrderItem[];
}

export async function placeOrder(input: PlaceOrderInput): Promise<string> {
  const { data: session } = await supabase.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Please sign in to place an order');
  const total = input.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);


  const { data: order, error } = await supabase
    .from('shop_orders')
    .insert({
      shop_id: input.shopId,
      user_id: uid,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      contact_email: input.contactEmail || null,
      fulfilment: input.fulfilment,
      address: input.address || null,
      note: input.note || null,
      total_amount: total,
      marketing_consent: input.marketingConsent,
      payment_method: input.paymentMethod ?? 'cash',
    } as any)

    .select('id')
    .single();
  if (error) throw error;

  const { error: itemsError } = await supabase.from('shop_order_items').insert(
    input.items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      product_name: i.product_name,
      unit_price: i.unit_price,
      quantity: i.quantity,
    })),
  );
  if (itemsError) throw itemsError;
  return order.id as string;
}

export async function listMyOrders(): Promise<ShopOrder[]> {
  const { data, error } = await supabase
    .from('shop_orders')
    .select('*, shops:shop_id(name, phone, address), shop_order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ShopOrder[];
}

export async function cancelMyOrder(orderId: string) {
  const { error } = await supabase
    .from('shop_orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId);
  if (error) throw error;
}

/** Customer says they completed the UPI payment; the shop still confirms receipt. */
export async function markOrderPaid(orderId: string) {
  const { error } = await supabase
    .from('shop_orders')
    .update({ payment_status: 'marked_paid', payment_marked_at: new Date().toISOString() } as any)
    .eq('id', orderId);
  if (error) throw error;
}

/** Shop confirms the money actually arrived (or resets it). */
export async function setOrderPaymentStatus(orderId: string, status: 'pending' | 'marked_paid' | 'received') {
  const { error } = await supabase
    .from('shop_orders')
    .update({ payment_status: status } as any)
    .eq('id', orderId);
  if (error) throw error;
}



// ------------------------------------------------------------- seller / shop
export async function getMyShop(): Promise<Shop | null> {
  const { data: session } = await supabase.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data } = await supabase
    .from('shops')
    .select('*, locations:nearest_location_id(mosque_name, district)')
    .eq('owner_user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as Shop) ?? null;
}

export async function applyForShop(payload: Record<string, unknown>) {
  const { data: session } = await supabase.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Please sign in first');
  const { error } = await supabase.from('shops').insert({ ...payload, owner_user_id: uid } as any);
  if (error) throw error;
}

export async function updateMyShop(shopId: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('shops').update(patch as any).eq('id', shopId);
  if (error) throw error;
}

export async function saveProduct(shopId: string, product: Partial<ShopProduct>) {
  if (product.id) {
    const { id, ...patch } = product;
    const { error } = await supabase.from('shop_products').update(patch as any).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase
    .from('shop_products')
    .insert({ ...(product as any), shop_id: shopId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase.from('shop_products').delete().eq('id', productId);
  if (error) throw error;
}

export async function listShopOrders(shopId: string): Promise<ShopOrder[]> {
  const { data, error } = await supabase
    .from('shop_orders')
    .select('*, shop_order_items(*)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ShopOrder[];
}

export async function setOrderStatus(orderId: string, status: OrderStatus, note?: string) {
  const { error } = await supabase
    .from('shop_orders')
    .update({ status, status_note: note || null })
    .eq('id', orderId);
  if (error) throw error;
}

/** Uploads a file to the private shop-media bucket and returns its path. */
export async function uploadShopMedia(folder: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('shop-media').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Straight-line distance in km between two coordinates. */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const formatMoney = (n: number) => `₹${Number(n ?? 0).toFixed(2).replace(/\.00$/, '')}`;
