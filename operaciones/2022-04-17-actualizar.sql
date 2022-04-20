set search_path=base;
set role preju2022_owner;

alter table tem 
  add column if not exists cant_h integer,
  alter column seleccionado type text;

--correr install/sincronizacion_tem.sql




