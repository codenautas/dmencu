-- Tabla no_rea_grupo0: cada operativo declara los grupos de segundo nivel de la no respuesta (no_rea.grupo0) y qué significan
-- para los controles de campo (otras causas, no encuestable que no entra en la tasa de efectividad, en curso).
-- Antes el código conocía los nombres ('otras causas', 'no encuestable...', 'no finalizada'); ahora salen de esta tabla.
-- Correr con el owner de la base; reemplazar los nombres ficticios por los de la instalación.
--set role <app>_owner;
set search_path = base;

create table if not exists "no_rea_grupo0" (
  "operativo" text not null,
  "grupo0" text,
  "orden" integer not null default 0,
  "es_otras_causas" boolean not null default false,
  "es_no_encuestable" boolean not null default false,
  "es_en_curso" boolean not null default false,
  primary key ("operativo", "grupo0")
);

-- el usuario admin (el que usa el backend) necesita poder modificar la tabla
--grant select, insert, update, delete on "no_rea_grupo0" to <app>_admin;
--grant all on "no_rea_grupo0" to <app>_owner;

alter table "no_rea_grupo0" drop constraint if exists "operativo<>''";
alter table "no_rea_grupo0" add constraint "operativo<>''" check ("operativo"<>'');
alter table "no_rea_grupo0" drop constraint if exists "grupo0<>''";
alter table "no_rea_grupo0" add constraint "grupo0<>''" check ("grupo0"<>'');

alter table "no_rea_grupo0" drop constraint if exists "no_rea_grupo0 operativos REL";
alter table "no_rea_grupo0" add constraint "no_rea_grupo0 operativos REL" foreign key ("operativo") references "operativos" ("operativo") on update cascade;
create index if not exists "operativo 4 no_rea_grupo0 IDX" on "no_rea_grupo0" ("operativo");

-- un registro por cada grupo0 que ya usan los no_rea, con el significado que hasta ahora tenía en el código;
-- si se vuelve a correr no pisa lo que se haya cambiado a mano
insert into "no_rea_grupo0" ("operativo", "grupo0", "orden", "es_otras_causas", "es_no_encuestable", "es_en_curso")
    select "operativo", "grupo0", min("orden"),
            "grupo0" = 'otras causas',
            "grupo0" like 'no encuestable%',
            "grupo0" = 'no finalizada'
        from "no_rea"
        where "grupo0" is not null
        group by "operativo", "grupo0"
    on conflict ("operativo", "grupo0") do nothing;

-- no_rea.grupo0 pasa a referenciar a no_rea_grupo0
alter table "no_rea" drop constraint if exists "no_rea no_rea_grupo0 REL";
alter table "no_rea" add constraint "no_rea no_rea_grupo0 REL" foreign key ("operativo", "grupo0") references "no_rea_grupo0" ("operativo", "grupo0") on update cascade;
create index if not exists "operativo,grupo0 4 no_rea IDX" on "no_rea" ("operativo", "grupo0");
