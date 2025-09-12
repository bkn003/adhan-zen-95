-- Enable Row Level Security on locations table
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to locations
CREATE POLICY "Allow public read access to locations" 
ON public.locations 
FOR SELECT 
USING (true);

-- Enable Row Level Security on prayer_times table  
ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to prayer_times
CREATE POLICY "Allow public read access to prayer_times" 
ON public.prayer_times 
FOR SELECT 
USING (true);