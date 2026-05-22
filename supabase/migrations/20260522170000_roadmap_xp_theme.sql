create table if not exists public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  theme text not null default 'midnight',
  created_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

create policy "user_stats_select_own"
on public.user_stats
for select
using (auth.uid() = user_id);

create policy "user_stats_insert_own"
on public.user_stats
for insert
with check (auth.uid() = user_id);

create policy "user_stats_update_own"
on public.user_stats
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

create policy "lesson_progress_select_own"
on public.lesson_progress
for select
using (auth.uid() = user_id);

create policy "lesson_progress_insert_own"
on public.lesson_progress
for insert
with check (auth.uid() = user_id);

create policy "lesson_progress_update_own"
on public.lesson_progress
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.stage_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stage_id text not null,
  correct integer not null,
  total integer not null,
  xp_gained integer not null,
  created_at timestamptz not null default now()
);

create index if not exists stage_quiz_attempts_user_id_idx on public.stage_quiz_attempts (user_id);
create index if not exists stage_quiz_attempts_stage_id_idx on public.stage_quiz_attempts (stage_id);

alter table public.stage_quiz_attempts enable row level security;

create policy "stage_quiz_attempts_select_own"
on public.stage_quiz_attempts
for select
using (auth.uid() = user_id);

create policy "stage_quiz_attempts_insert_own"
on public.stage_quiz_attempts
for insert
with check (auth.uid() = user_id);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id text not null,
  correct integer not null,
  total integer not null,
  xp_gained integer not null,
  created_at timestamptz not null default now()
);

create index if not exists exam_attempts_user_id_idx on public.exam_attempts (user_id);
create index if not exists exam_attempts_exam_id_idx on public.exam_attempts (exam_id);

alter table public.exam_attempts enable row level security;

create policy "exam_attempts_select_own"
on public.exam_attempts
for select
using (auth.uid() = user_id);

create policy "exam_attempts_insert_own"
on public.exam_attempts
for insert
with check (auth.uid() = user_id);

create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists learning_goals_user_id_idx on public.learning_goals (user_id);

alter table public.learning_goals enable row level security;

create policy "learning_goals_select_own"
on public.learning_goals
for select
using (auth.uid() = user_id);

create policy "learning_goals_insert_own"
on public.learning_goals
for insert
with check (auth.uid() = user_id);

create policy "learning_goals_delete_own"
on public.learning_goals
for delete
using (auth.uid() = user_id);
