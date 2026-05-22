
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nick TEXT NOT NULL UNIQUE,
  skill_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Public nick uniqueness check (read-only function)
CREATE OR REPLACE FUNCTION public.nick_exists(_nick TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE lower(nick) = lower(_nick));
$$;
GRANT EXECUTE ON FUNCTION public.nick_exists(TEXT) TO anon, authenticated;

-- Level progress
CREATE TABLE public.level_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_number INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, level_number)
);
ALTER TABLE public.level_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_select_own" ON public.level_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lp_insert_own" ON public.level_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_number INT NOT NULL,
  correct INT NOT NULL,
  total INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_select_own" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "qa_insert_own" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Study events (calendar)
CREATE TABLE public.study_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "se_select_own" ON public.study_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "se_insert_own" ON public.study_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "se_update_own" ON public.study_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "se_delete_own" ON public.study_events FOR DELETE USING (auth.uid() = user_id);
