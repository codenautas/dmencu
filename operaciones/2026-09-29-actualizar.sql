set search_path = base;

alter table no_rea add column if not exists "orden" integer default 0;
update no_rea set orden = 0 where orden is null;
alter table no_rea alter column "orden" set not null;

alter table no_rea_sup add column if not exists "operativo" text;
update no_rea_sup set orden = 0 where orden is null;
alter table no_rea_sup add column if not exists "orden" integer default 0;

alter table no_rea_sup alter column "orden" set not null;

--cambiar por operativo correspondiente
--update no_rea_sup set operativo = 'etoi274' where operativo is null;
alter table no_rea_sup alter column "operativo" set not null;

ALTER TABLE no_rea_sup DROP CONSTRAINT no_rea_sup_pkey;
ALTER TABLE no_rea_sup ADD PRIMARY KEY (operativo, no_rea_sup);

alter table "no_rea_sup" add constraint "operativo<>''" check ("operativo"<>'');

alter table "no_rea_sup" add constraint "no_rea_sup operativos REL" foreign key ("operativo") references "operativos" ("operativo")  on update cascade;



