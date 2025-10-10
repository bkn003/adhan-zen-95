
export interface Location {
  id: string;
  mosque_name: string;
  district: string;
  latitude: number;
  longitude: number;
  sahar_food_availability?: boolean;
  sahar_food_contact_number?: string;
  sahar_food_time?: string;
  women_prayer_hall?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PrayerTime {
  id: string;
  location_id: string;
  month: string;
  date_range: string;
  fajr_adhan: string;
  fajr_adhan_offset?: string;
  fajr_iqamah: string;
  fajr_ramadan_iqamah?: string;
  dhuhr_adhan: string;
  dhuhr_iqamah: string;
  asr_adhan: string;
  asr_adhan_offset?: string;
  asr_iqamah: string;
  maghrib_adhan: string;
  maghrib_iqamah: string;
  iftar_time?: string;
  maghrib_ramadan_adhan?: string;
  maghrib_iqamah_adhan?: string;
  isha_adhan: string;
  isha_adhan_offset?: string;
  isha_iqamah: string;
  isha_ramadan_iqamah?: string;
  taraweeh?: string;
  sahar_end?: string;
  sun_rise?: string;
  mid_noon?: string;
  sun_set?: string;
  jummah_adhan?: string;
  jummah_iqamah?: string;
  created_at?: string;
}

export interface Prayer {
  name: string;
  adhan: string;
  iqamah: string;
  type: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'jummah' | 'tarawih';
  isNext?: boolean;
  isCurrent?: boolean;
}

export interface HijriDate {
  date: string;
  month: string;
  year: string;
  designation: string;
  adjustedDate: string;
  monthNumber?: number;
}

export interface ForbiddenTime {
  name: string;
  time: string;
  type: 'sunrise' | 'noon' | 'sunset';
}
