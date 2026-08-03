-- Enable the pgcrypto extension for gen_random_uuid
create extension if not exists "pgcrypto";

-- 1. Contas Google vinculadas
create table if not exists public.google_accounts (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  refresh_token_encrypted text not null, -- Criptografado via App-Level (AES-GCM)
  scopes text[],
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 2. Integrações habilitadas por projeto
create table if not exists public.google_integrations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  project_id uuid, -- Opcional, se for global ('all')
  integration_type text not null, -- 'calendar', 'drive', 'docs', 'sheets', 'meet', 'gmail'
  is_active boolean default true,
  config jsonb default '{}',
  updated_at timestamp with time zone default now()
);

-- 3. Recursos associados (Mapeamento de arquivos/recursos)
create table if not exists public.google_resources (
  id uuid default gen_random_uuid() primary key,
  integration_id uuid references public.google_integrations on delete cascade,
  resource_id text not null, -- ID do Google (file_id, folder_id, calendar_id, etc)
  resource_type text not null,
  devban_entity_id uuid, -- card_id ou project_id
  metadata jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- Set up RLS
alter table public.google_accounts enable row level security;
alter table public.google_integrations enable row level security;
alter table public.google_resources enable row level security;

-- Policies
create policy "Users can view their own Google accounts" on public.google_accounts for select using (auth.uid() = id);
create policy "Users can manage their own Google integrations" on public.google_integrations for all using (auth.uid() = user_id);
create policy "Users can manage their own Google resources" on public.google_resources for all using (exists (select 1 from public.google_integrations where id = google_resources.integration_id and user_id = auth.uid()));
