-- Actualizar
set search_path = base;

do $command$ 
declare
  vTareasConAsignante boolean;
begin
  select true
    into vTareasConAsignante
    from information_schema.columns
	where table_schema='base'
	  and table_name='tareas_areas'
	  and column_name='asignante';
  if vTareasConAsignante or true then
    alter table tareas_areas rename column asignante to recepcionista;
	DROP TRIGGER IF EXISTS sincro_tareas_areas_tareas_tem_trg ON tareas_areas;
	DROP FUNCTION if exists sincro_tareas_areas_tareas_tem_trg();
	alter table tareas_areas drop column fecha_asignacion;
	alter table tareas_areas drop column operacion;
	alter table tareas_areas drop column obs_asignante;
    alter table "tareas_areas" drop constraint "asignante<>''";
    alter table "tareas_areas" add constraint "recepcionista<>''" check ("recepcionista"<>'');
    alter table "tareas_areas" drop constraint "tareas_areas at REL";
    alter table "tareas_areas" add constraint "tareas_areas recepcionista REL" foreign key ("recepcionista") references "usuarios" ("idper")  on update cascade;
    alter index "asignante 4 tareas_areas IDX" rename to "recepcionista 4 tareas_areas IDX";
	DROP TRIGGER IF EXISTS asignar_desasignar_tareas_tem_trg ON tareas_tem;
	DROP FUNCTION if exists asignar_desasignar_tareas_tem_trg();
    alter table tareas_tem rename column recepcionista_tarea to recepcionista;
    alter table "tareas_tem" add constraint "recepcionista<>''" check ("recepcionista"<>'');
    alter table "tareas_tem" add constraint "tareas_tem recepcionista REL" foreign key ("recepcionista") references "usuarios" ("idper")  on update cascade;
    alter table "tareas" rename column rol_asignante to rol_recepcionista;
    raise notice 'cambios debidos a tareas_areas.asignante realizadas!';
	raise notice 'correr: install/sincro_tareas_areas_tareas_tem_trg.sql';
	raise notice 'correr: install/asignar_desasignar_tareas_tem_trg';
  end if;
end; 
$command$;

