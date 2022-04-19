set role to discon_owner;
--set role to dmencu_owner;
--set role to preju_test2022_owner;
--set role to preju_capa2022_owner;
set search_path=base;
update tareas set rol_asignante='recepcionista' where tarea='recu' and operativo='PREJU_2022';
update tareas set rol_asignante='automatico' where tarea='supe' and operativo='PREJU_2022'; --esto ver si es necesario cambiarlo
---- agregado campos relacionados a la rea, no_rea de la supervisión
alter table tem add column  if not exists  rea_sup integer;
alter table tem add column  if not exists  norea_sup integer;
alter table tem add column if not exists resumen_estado_sup text;

alter table tareas_tem add column if not exists rea_sup integer;
alter table tareas_tem add column if not exists norea_sup integer;
alter table tareas_tem add column if not exists resumen_estado_sup text;