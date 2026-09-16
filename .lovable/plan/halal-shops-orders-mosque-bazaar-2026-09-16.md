# Halal Shops & Orders (Mosque Bazaar)

A halal-only local marketplace inside the app: nearby shops list products, mosque users browse and place orders in the app, and the shop confirms and settles payment on pickup or delivery. No online payment in this version.

## Is it worth adding?

Yes, with limits. It fits naturally: your users already pick a mosque and an area, so "halal shops near your mosque" is genuinely useful, especially around Ramadan and Eid. It also gives you real contact lists for campaigns and a reason for shops to promote the app.

The risks to keep in mind:
- Trust: one non-halal item damages the app's reputation. So shops are approved one by one, every shop must accept a halal-only declaration, and any user can report a product.
- Moderation load: shop applications and reports need someone to review them. Approval can be delegated so it doesn't all land on you.
- No money handled in the app, so no refunds, chargebacks or app-store payment rules to deal with in this version.

Recommendation: launch as it is planned here, watch a few mosques for a month, and only consider online payment once shops are actually fulfilling orders.

## What users see

**Shops tab (new bottom-nav item "Shops")**
- Shops near the user's selected mosque first, then wider area, with distance shown.
- Search and category chips: Groceries, Meat & Poultry, Bakery, Restaurant, Dates & Dry Fruits, Attar & Gifts, Books, Clothing, Other.
- Every shop card shows a "Halal declared" badge, rating, distance and open/closed.

**Shop page**
- Photos, address, phone, map/directions link, timings, delivery or pickup, minimum order.
- Product list with photo, price, unit, availability. Report button on each product.
- Cart per shop, then Place order.

**Placing an order**
- Requires sign-in. Asks for name, mobile number and email (pre-filled from the profile when available), pickup or delivery, address if delivery, and a note.
- A consent checkbox: "Share my name, mobile and email with this shop and allow the app to contact me about offers." Order can be placed without ticking it; only ticked users enter the campaign list.
- Order states: Placed, Confirmed, Ready, Completed, Cancelled. User sees their own orders under "My orders".

**Become a seller**
- Public "Sell on the app" form: shop name, owner name, mobile, email, category, address, area, mosque nearby, map link, optional halal certificate photo, and a required halal-only declaration.
- After submitting, the shop owner sees the application status. Once approved, the same person gets a Shop Manager area to add products, mark items out of stock, set timings, and accept or reject orders.

## Admin side

**Super admin**
- Master switch to turn the whole marketplace on or off across the app.
- Review queue for shop applications: view details and certificate, approve, reject with reason, or pause an existing shop.
- Grant "can approve shops" to mosque admins or to any specific signed-in person, per mosque or globally.
- Reported products queue: hide a product, or pause the shop.
- Campaign list: users who consented, with name, mobile, email, mosque and area, exportable as CSV.

**Mosque admin (only if granted)**
- Sees applications and reports for its own mosque area only, and can approve, reject or pause there.

## Halal enforcement

- No shop is visible until approved.
- Each shop signs a halal-only declaration; breaking it is grounds for immediate pause.
- Products go live immediately once the shop is approved (keeps shops active), but every product has a Report button. Three reports auto-hide a product pending review, matching how mosque reviews already work.
- Shop pages show the declaration and the certificate when one was uploaded.

## Technical notes

New tables (all with grants, RLS and updated_at triggers):
- `shops` — owner_user_id, name, owner_name, phone, email, category, description, address, area/district, latitude, longitude, map_link, nearest_location_id, timings, delivery_available, pickup_available, min_order_amount, halal_declared, halal_certificate_path, status (pending/approved/rejected/paused), rejection_reason, approved_by, approved_at.
- `shop_products` — shop_id, name, description, price, unit, photo_path, category, is_available, is_hidden, report_count.
- `shop_product_reports` — product_id, user_id, reason, unique per user+product; a `report_shop_product` security-definer function mirrors `report_mosque_review` and hides at 3 reports.
- `shop_orders` — shop_id, user_id, contact_name, contact_phone, contact_email, fulfilment (pickup/delivery), address, note, total_amount, status, status_note, marketing_consent.
- `shop_order_items` — order_id, product_id, product_name, unit_price, quantity.
- `shop_approvers` — user_id, location_id nullable for global, granted_by.
- `app_settings` key `shops_enabled` for the master switch.

Access rules:
- Anon and signed-in users read approved, unpaused shops and their visible, available products only, and only while `shops_enabled` is true.
- Shop owners read and write their own shop, products and orders.
- Buyers read and cancel their own orders.
- Approvers and super admins read applications and reports through a new `shop-admin` edge function that validates the caller's JWT and checks `has_role` / `shop_approvers`; contact details and the campaign export are only served there, never to the client directly.
- Shop photos and halal certificates go in a new private `shop-media` bucket with signed URLs, reusing the pattern in `src/utils/signedPhotoUrls.ts`.

Frontend:
- New screens `ShopsScreen`, `ShopDetailsScreen`, `ShopCartCheckout`, `MyOrdersScreen`, `SellerApplyScreen`, `ShopManagerScreen`, plus a Shops tab in `BottomNavigation` and the `Screen` union, wired through `src/pages/Index.tsx` the same way existing screens and overlays are (localStorage `currentScreen`, popstate back handling).
- Marketplace sections added to `SuperAdminPanel` (applications, reports, approvers, campaign list, master switch) and `MosqueAdminPanel` (own-area applications and reports, shown only when granted).
- Distance sorting reuses the existing geolocation and mosque-distance helpers.
- All new labels added to `src/i18n/translations.ts` for every supported language.
- Order status changes reuse the existing FCM push path so buyers get notified on confirm/ready.

## Build order

1. Migration: tables, grants, RLS, report function, `shops_enabled` setting, `shop-media` bucket.
2. `shop-admin` edge function: applications, approve/reject/pause, reports, approvers, campaign export.
3. Seller apply form and shop manager (products, timings, orders).
4. Shops tab, shop page, cart, checkout with consent, My orders.
5. Super admin and mosque admin sections.
6. Translations, push notifications on status change, end-to-end walkthrough with one real shop.
