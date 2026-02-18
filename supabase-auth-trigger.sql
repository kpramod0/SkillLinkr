-- Trigger to create a profile entry ONLY when a user is verified
-- REVISED: Handles both "Created Verified" AND "Verified Later" scenarios.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Only create profile if email is confirmed
  if new.email_confirmed_at is not null then
      insert into public.profiles (id, first_name, last_name, role, email, onboarding_completed)
      values (
        new.email, -- Use Email as ID
        'New', 
        'User', 
        coalesce(new.raw_user_meta_data->>'role', 'student'),
        new.email, -- Store email
        false
      )
      ON CONFLICT (id) DO NOTHING; -- If profile exists, do nothing.
  end if;
  
  return new;
end;
$$;

-- Drop old trigger
drop trigger if exists on_auth_user_created on auth.users;

-- Create new trigger that fires on INSERT (if created verified) and UPDATE (when verification happens)
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();
