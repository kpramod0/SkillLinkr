-- Trigger to create a profile entry when a new user signs up via Supabase Auth
-- REVISED: Uses new.email as ID to match legacy schema and handles duplicates.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role, email, onboarding_completed)
  values (
    new.email, -- IMPORTANT: Use Email as ID to match legacy architecture
    'New', 
    'User', 
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.email,
    false
  )
  ON CONFLICT (id) DO NOTHING; -- If profile exists (legacy user), do nothing (adopt it).
  
  return new;
end;
$$;

-- Ensure trigger is set
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
