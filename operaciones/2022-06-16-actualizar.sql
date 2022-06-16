set role preju2022_owner;

set search_path=base;
alter table tem add column proie text;
alter table "tem" add constraint "proie<>''" check ("proie"<>'');

