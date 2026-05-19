drop policy if exists "events_read_public_published" on public.events;

create policy "events_read_public_published"
on public.events for select
to anon
using (status in ('published', 'active'));
