set role to preju2022_owner;
--set role to preju_test2022_owner;
--set role to preju_capa2022_owner;

set search_path = base;

alter table tareas_tem drop column if exists resultado ;
alter table tareas_tem drop column if exists fecha_resultado ;

drop table if exists resultados_tarea;