
-- Create locations table
CREATE TABLE public.locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mosque_name TEXT NOT NULL,
  district TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create prayer times table
CREATE TABLE public.prayer_times (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  date_range TEXT NOT NULL,
  fajr_adhan TIME NOT NULL,
  fajr_adhan_offset TIME,
  fajr_iqamah TIME NOT NULL,
  fajr_ramadan_iqamah TIME,
  dhuhr_adhan TIME NOT NULL,
  dhuhr_iqamah TIME NOT NULL,
  asr_adhan TIME NOT NULL,
  asr_adhan_offset TIME,
  asr_iqamah TIME NOT NULL,
  maghrib_adhan TIME NOT NULL,
  maghrib_iqamah TIME NOT NULL,
  iftar_time TIME,
  maghrib_ramadan_adhan TIME,
  maghrib_iqamah_adhan TIME,
  isha_adhan TIME NOT NULL,
  isha_adhan_offset TIME,
  isha_iqamah TIME NOT NULL,
  isha_ramadan_iqamah TIME,
  taraweeh TIME,
  sahar_end TIME,
  sun_rise TIME,
  mid_noon TIME,
  sun_set TIME,
  jummah_adhan TIME,
  jummah_iqamah TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on locations" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Allow public read access on prayer_times" ON public.prayer_times FOR SELECT USING (true);

-- Insert sample location data
INSERT INTO public.locations (mosque_name, district, latitude, longitude) VALUES
('KADHERPET MOSQUE, KADHERPET', 'TIRUPUR', 11.10671671, 77.34032489),
('AL-NOOR MOSQUE', 'TIRUPUR', 11.10891234, 77.34156789),
('JAMA MASJID', 'TIRUPUR', 11.10543210, 77.33987654);

-- Insert sample prayer times for current month
INSERT INTO public.prayer_times (
  location_id, 
  month, 
  date_range, 
  fajr_adhan, 
  fajr_iqamah, 
  dhuhr_adhan, 
  dhuhr_iqamah, 
  asr_adhan, 
  asr_iqamah, 
  maghrib_adhan, 
  maghrib_iqamah, 
  isha_adhan, 
  isha_iqamah,
  fajr_ramadan_iqamah,
  isha_ramadan_iqamah,
  taraweeh,
  sahar_end,
  sun_rise,
  mid_noon,
  sun_set,
  jummah_adhan,
  jummah_iqamah
) 
SELECT 
  l.id,
  'January',
  '1-31',
  '05:45:00'::TIME,
  '06:00:00'::TIME,
  '12:30:00'::TIME,
  '12:45:00'::TIME,
  '16:15:00'::TIME,
  '16:30:00'::TIME,
  '18:45:00'::TIME,
  '18:50:00'::TIME,
  '20:00:00'::TIME,
  '20:15:00'::TIME,
  '05:55:00'::TIME,
  '20:30:00'::TIME,
  '21:30:00'::TIME,
  '05:30:00'::TIME,
  '06:30:00'::TIME,
  '12:15:00'::TIME,
  '18:30:00'::TIME,
  '12:15:00'::TIME,
  '12:30:00'::TIME
FROM public.locations l;
