CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (singleton),
  legacy_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  date_of_birth TEXT,
  website TEXT,
  city TEXT,
  summary_en TEXT,
  summary_id TEXT,
  bio_en TEXT,
  bio_id TEXT,
  about_intro TEXT,
  resume_intro TEXT,
  footer_tagline TEXT,
  avatar_url TEXT,
  cv_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  percentage INTEGER NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  degree TEXT NOT NULL,
  short_degree TEXT,
  school TEXT NOT NULL,
  thesis TEXT,
  field TEXT,
  start_year TEXT,
  end_year TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  company TEXT NOT NULL,
  role TEXT,
  location TEXT,
  start_label TEXT,
  end_label TEXT,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id BIGINT UNIQUE,
  experience_id UUID NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  project_location TEXT NOT NULL,
  start_label TEXT,
  end_label TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS social_links_sort_order_idx ON public.social_links(sort_order);
CREATE INDEX IF NOT EXISTS skills_sort_order_idx ON public.skills(sort_order);
CREATE INDEX IF NOT EXISTS education_sort_order_idx ON public.education(sort_order);
CREATE INDEX IF NOT EXISTS experiences_sort_order_idx ON public.experiences(sort_order);
CREATE INDEX IF NOT EXISTS projects_experience_sort_idx ON public.projects(experience_id, sort_order);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles', 'social_links', 'skills', 'education', 'experiences', 'projects']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      table_name
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_contact_rate_limit(
  p_key_hash TEXT,
  p_limit INTEGER DEFAULT 5,
  p_window INTERVAL DEFAULT INTERVAL '1 hour'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  INSERT INTO public.contact_rate_limits AS limits (key_hash, window_start, request_count)
  VALUES (p_key_hash, NOW(), 1)
  ON CONFLICT (key_hash) DO UPDATE
  SET
    window_start = CASE WHEN NOW() - limits.window_start >= p_window THEN NOW() ELSE limits.window_start END,
    request_count = CASE WHEN NOW() - limits.window_start >= p_window THEN 1 ELSE limits.request_count + 1 END
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_contact_rate_limit(TEXT, INTEGER, INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_contact_rate_limit(TEXT, INTEGER, INTERVAL) TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resume-assets',
  'resume-assets',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
