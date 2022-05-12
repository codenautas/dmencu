set search_path = base;
set role preju2022_owner;

alter table inconsistencias 
  rename id_caso to vivienda;
alter table inconsistencias 
  add column hogar bigint,
  add column persona bigint,
  add column visita bigint;


-- correr install/actualizar_inconvar.sql
-- correr install/desintegrapk.sql