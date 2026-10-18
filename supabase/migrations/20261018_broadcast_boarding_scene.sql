-- Allow the new /boarding scene to be cued from the control dashboard.
alter table public.broadcast_state drop constraint if exists broadcast_state_scene_check;
alter table public.broadcast_state add constraint broadcast_state_scene_check
  check (scene in ('overlay', 'map', 'next', 'turnaround', 'compact', 'boarding'));
