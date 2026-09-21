/** Call / WhatsApp / directions links used on shop pages and in the admin queue. */
import { normalizeMobile } from './validation';

export const telLink = (phone?: string | null) => {
  const n = normalizeMobile(phone || '');
  return n ? `tel:+91${n}` : '';
};

export const whatsappLink = (phone?: string | null, message?: string) => {
  const n = normalizeMobile(phone || '');
  if (!n) return '';
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/91${n}${text}`;
};

/**
 * Directions link: exact coordinates when the shop pinned its location,
 * otherwise its own map link, otherwise a search on the address.
 */
export const directionsLink = (shop: {
  latitude?: number | null;
  longitude?: number | null;
  map_link?: string | null;
  address?: string | null;
  name?: string;
}) => {
  if (shop.latitude != null && shop.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
  }
  if (shop.map_link) return shop.map_link;
  const q = [shop.name, shop.address].filter(Boolean).join(' ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
};
