-- GeoApp Phase 3: account, idempotent progress import and achievement storage.
-- Apply with the Supabase CLI or SQL migrations, never from the browser.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'de'
    check (char_length(locale) between 2 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.devices (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  id uuid not null,
  installation_id uuid not null,
  label text,
  last_seen_at timestamptz not null default now(),
  primary key (profile_id, id),
  unique (profile_id, installation_id)
);

create table public.progress_events (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 512),
  device_id uuid not null,
  session_id text not null check (char_length(session_id) between 1 and 512),
  question_id text not null check (char_length(question_id) between 1 and 512),
  entity_id text not null check (char_length(entity_id) between 1 and 512),
  skill_key text not null check (char_length(skill_key) between 1 and 512),
  outcome text not null
    check (outcome in ('correct', 'incorrect', 'timed_out', 'skipped')),
  score integer not null check (score >= 0),
  response_time_ms integer not null check (response_time_ms >= 0),
  occurred_at timestamptz not null,
  dataset_version text not null
    check (char_length(dataset_version) between 1 and 512),
  quiz_definition_id text not null
    check (char_length(quiz_definition_id) between 1 and 512),
  schema_version integer not null check (schema_version = 1),
  received_at timestamptz not null default now(),
  primary key (profile_id, id),
  foreign key (profile_id, device_id)
    references public.devices (profile_id, id) on delete cascade
);

create table public.achievement_unlocks (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null
    check (char_length(achievement_id) between 1 and 512),
  definition_version integer not null check (definition_version > 0),
  unlocked_at timestamptz not null,
  source_event_ids text[] not null default '{}',
  verification text not null default 'local'
    check (verification in ('local', 'server')),
  created_at timestamptz not null default now(),
  primary key (profile_id, achievement_id)
);

create table public.sync_import_batches (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 128),
  device_id uuid not null,
  event_count integer not null default 0 check (event_count >= 0),
  unlock_count integer not null default 0 check (unlock_count >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (profile_id, id),
  foreign key (profile_id, device_id)
    references public.devices (profile_id, id) on delete cascade
);

create index devices_profile_last_seen_idx
  on public.devices (profile_id, last_seen_at desc);
create index progress_events_profile_occurred_idx
  on public.progress_events (profile_id, occurred_at desc);
create index progress_events_profile_skill_occurred_idx
  on public.progress_events (profile_id, skill_key, occurred_at desc);
create index progress_events_profile_device_idx
  on public.progress_events (profile_id, device_id);
create index achievement_unlocks_profile_unlocked_idx
  on public.achievement_unlocks (profile_id, unlocked_at desc);
create index sync_import_batches_profile_device_idx
  on public.sync_import_batches (profile_id, device_id);

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.progress_events enable row level security;
alter table public.achievement_unlocks enable row level security;
alter table public.sync_import_batches enable row level security;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy devices_select_own
  on public.devices for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy devices_insert_own
  on public.devices for insert to authenticated
  with check ((select auth.uid()) = profile_id);
create policy devices_update_own
  on public.devices for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy progress_events_select_own
  on public.progress_events for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy progress_events_insert_own
  on public.progress_events for insert to authenticated
  with check ((select auth.uid()) = profile_id);

create policy achievement_unlocks_select_own
  on public.achievement_unlocks for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy achievement_unlocks_insert_own
  on public.achievement_unlocks for insert to authenticated
  with check ((select auth.uid()) = profile_id);
create policy achievement_unlocks_update_own
  on public.achievement_unlocks for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy sync_import_batches_select_own
  on public.sync_import_batches for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy sync_import_batches_insert_own
  on public.sync_import_batches for insert to authenticated
  with check ((select auth.uid()) = profile_id);
create policy sync_import_batches_update_own
  on public.sync_import_batches for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.import_progress_batch(
  p_batch_id text,
  p_installation_id uuid,
  p_device_id uuid,
  p_events jsonb,
  p_unlocks jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := (select auth.uid());
  v_device_id uuid;
  v_inserted integer := 0;
begin
  if v_profile_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_batch_id is null or char_length(p_batch_id) not between 1 and 128 then
    raise exception 'invalid batch id' using errcode = '22023';
  end if;
  if jsonb_typeof(p_events) <> 'array'
     or jsonb_typeof(p_unlocks) <> 'array' then
    raise exception 'events and unlocks must be arrays' using errcode = '22023';
  end if;
  if jsonb_array_length(p_events) > 5000
     or jsonb_array_length(p_unlocks) > 1000 then
    raise exception 'import batch is too large' using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (v_profile_id)
  on conflict (id) do nothing;

  insert into public.devices (
    profile_id,
    id,
    installation_id,
    last_seen_at
  )
  values (
    v_profile_id,
    p_device_id,
    p_installation_id,
    now()
  )
  on conflict (profile_id, installation_id)
  do update set
    last_seen_at = excluded.last_seen_at
  returning id into v_device_id;

  insert into public.sync_import_batches (
    profile_id,
    id,
    device_id,
    event_count,
    unlock_count
  )
  values (
    v_profile_id,
    p_batch_id,
    v_device_id,
    jsonb_array_length(p_events),
    jsonb_array_length(p_unlocks)
  )
  on conflict (profile_id, id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return jsonb_build_object('status', 'already_imported');
  end if;

  insert into public.progress_events (
    profile_id,
    id,
    device_id,
    session_id,
    question_id,
    entity_id,
    skill_key,
    outcome,
    score,
    response_time_ms,
    occurred_at,
    dataset_version,
    quiz_definition_id,
    schema_version
  )
  select
    v_profile_id,
    event_item ->> 'id',
    v_device_id,
    event_item ->> 'sessionId',
    event_item ->> 'questionId',
    event_item ->> 'entityId',
    event_item ->> 'skillKey',
    event_item ->> 'outcome',
    (event_item ->> 'score')::integer,
    (event_item ->> 'responseTimeMs')::integer,
    (event_item ->> 'occurredAt')::timestamptz,
    event_item ->> 'datasetVersion',
    event_item ->> 'quizDefinitionId',
    (event_item ->> 'schemaVersion')::integer
  from jsonb_array_elements(p_events) as event_item
  on conflict (profile_id, id) do nothing;

  insert into public.achievement_unlocks (
    profile_id,
    achievement_id,
    definition_version,
    unlocked_at,
    source_event_ids,
    verification
  )
  select
    v_profile_id,
    unlock_item ->> 'achievementId',
    (unlock_item ->> 'definitionVersion')::integer,
    (unlock_item ->> 'unlockedAt')::timestamptz,
    coalesce(
      array(
        select jsonb_array_elements_text(
          coalesce(unlock_item -> 'sourceEventIds', '[]'::jsonb)
        )
      ),
      '{}'::text[]
    ),
    'local'
  from jsonb_array_elements(p_unlocks) as unlock_item
  on conflict (profile_id, achievement_id)
  do update set
    definition_version = greatest(
      public.achievement_unlocks.definition_version,
      excluded.definition_version
    ),
    unlocked_at = least(
      public.achievement_unlocks.unlocked_at,
      excluded.unlocked_at
    ),
    source_event_ids = array(
      select distinct source_id
      from unnest(
        public.achievement_unlocks.source_event_ids
        || excluded.source_event_ids
      ) as source_id
      order by source_id
    ),
    verification = case
      when public.achievement_unlocks.verification = 'server'
        then 'server'
      else 'local'
    end;

  update public.sync_import_batches
  set completed_at = now()
  where profile_id = v_profile_id and id = p_batch_id;

  return jsonb_build_object(
    'status', 'imported',
    'event_count', jsonb_array_length(p_events),
    'unlock_count', jsonb_array_length(p_unlocks)
  );
end;
$$;

revoke all on public.profiles from anon;
revoke all on public.devices from anon;
revoke all on public.progress_events from anon;
revoke all on public.achievement_unlocks from anon;
revoke all on public.sync_import_batches from anon;

revoke all on public.devices from authenticated;
revoke all on public.progress_events from authenticated;
revoke all on public.achievement_unlocks from authenticated;
revoke all on public.sync_import_batches from authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.devices to authenticated;
grant select on public.progress_events to authenticated;
grant select on public.achievement_unlocks to authenticated;
grant select on public.sync_import_batches to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.import_progress_batch(
  text, uuid, uuid, jsonb, jsonb
) from public, anon;
grant execute on function public.import_progress_batch(
  text, uuid, uuid, jsonb, jsonb
) to authenticated;
