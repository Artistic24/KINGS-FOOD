ALTER TABLE public.rider_requests
  ADD COLUMN IF NOT EXISTS id_type text NOT NULL DEFAULT 'national_id';
ALTER TABLE public.rider_requests
  ADD CONSTRAINT rider_requests_id_type_check CHECK (id_type IN ('national_id','passport','drivers_license'));