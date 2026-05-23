alter table public.profiles
add column if not exists email text;

update public.profiles as p
set email = case
  when u.email is null then null
  when lower(u.email) like '%@cppquest.local' then null
  else lower(u.email)
end
from auth.users as u
where u.id = p.id
  and p.email is distinct from case
    when u.email is null then null
    when lower(u.email) like '%@cppquest.local' then null
    else lower(u.email)
  end;

create unique index if not exists profiles_email_lower_unique_idx
on public.profiles (lower(email))
where email is not null;
