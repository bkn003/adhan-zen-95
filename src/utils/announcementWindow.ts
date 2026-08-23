/**
 * Shared visibility-window logic for mosque announcements.
 *
 * Admins can optionally set `visible_from` / `visible_until` on an
 * announcement ("show this from … until …"). Outside that window the
 * announcement disappears from the mosque page, the follow feed and the
 * home-page popup. Announcements without a window behave as before.
 */

export interface WindowedAnnouncement {
  visible_from?: string | null;
  visible_until?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** List visibility (mosque page / feed): hidden only outside an explicit window. */
export function isAnnouncementVisible(a: WindowedAnnouncement, now: number = Date.now()): boolean {
  if (a.visible_from && now < new Date(a.visible_from).getTime()) return false;
  if (a.visible_until && now > new Date(a.visible_until).getTime()) return false;
  return true;
}

/**
 * Popup visibility (home page): additionally, announcements with NO window
 * only pop up for 2 days after publishing so old posts don't nag forever.
 */
export function isAnnouncementPopupActive(a: WindowedAnnouncement, now: number = Date.now()): boolean {
  if (!isAnnouncementVisible(a, now)) return false;
  if (!a.visible_from && !a.visible_until) {
    const published = new Date(a.created_at ?? 0).getTime();
    if (!published || now - published > 2 * 24 * 3600e3) return false;
  }
  return true;
}
