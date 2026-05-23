create policy "lesson_progress_delete_own"
on public.lesson_progress
for delete
using (auth.uid() = user_id);

create policy "stage_quiz_attempts_delete_own"
on public.stage_quiz_attempts
for delete
using (auth.uid() = user_id);

create policy "exam_attempts_delete_own"
on public.exam_attempts
for delete
using (auth.uid() = user_id);
