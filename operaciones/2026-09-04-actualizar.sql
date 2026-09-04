set search_path = base;

alter table tareas_tem rename norea to dm_norea;
alter table tareas_tem rename rea to dm_rea;
alter table tareas_tem rename resumen_estado to dm_resumen_estado;

alter table tareas_tem rename norea_sup to dm_norea_sup;
alter table tareas_tem rename rea_sup to dm_rea_sup;
alter table tareas_tem rename resumen_estado_sup to dm_resumen_estado_sup;