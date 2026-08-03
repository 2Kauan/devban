-- Create app_updates table
CREATE TABLE IF NOT EXISTS public.app_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to app_updates" ON public.app_updates
    FOR SELECT USING (true);

-- Function to keep only the latest 5 updates
CREATE OR REPLACE FUNCTION public.keep_only_latest_app_updates()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.app_updates
    WHERE id NOT IN (
        SELECT id FROM public.app_updates
        ORDER BY created_at DESC
        LIMIT 5
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute the function on insert
CREATE OR REPLACE TRIGGER tr_keep_only_latest_app_updates
AFTER INSERT ON public.app_updates
FOR EACH STATEMENT
EXECUTE FUNCTION public.keep_only_latest_app_updates();
