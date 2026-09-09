set search_path = base;

alter table tareas_tem rename norea to dm_norea;
alter table tareas_tem rename rea to dm_rea;
alter table tareas_tem rename resumen_estado to dm_resumen_estado;

alter table tareas_tem rename norea_sup to dm_norea_sup;
alter table tareas_tem rename rea_sup to dm_rea_sup;
alter table tareas_tem rename resumen_estado_sup to dm_resumen_estado_sup;

CREATE OR REPLACE FUNCTION agregar_historial_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
    declare
        v_proximo_orden integer;
        v_recepcionista text;
        v_asignado text;
        v_json_encuesta jsonb;
        v_dm_resumen_estado text;
        v_dm_resumen_estado_sup text;
        v_dm_rea integer;
        v_dm_norea integer;
        v_dm_rea_sup integer;
        v_dm_norea_sup integer;
        v_estado text;
        v_verificado text;
begin
    if old.tarea_actual is distinct from new.tarea_actual and new.tarea_actual is not null and old.tarea_actual is not null then
        select coalesce(max(orden),0)+1 into v_proximo_orden
            from historial_tem 
            where operativo = old.operativo and enc = old.enc;
        
        select recepcionista, asignado, dm_resumen_estado, dm_resumen_estado_sup, dm_rea, dm_norea, dm_rea_sup, dm_norea_sup, estado, verificado  into
            v_recepcionista, v_asignado, v_dm_resumen_estado, v_dm_resumen_estado_sup, v_dm_rea, v_dm_norea, v_dm_rea_sup, v_dm_norea_sup, v_estado, v_verificado
            from tareas_tem 
            where operativo = old.operativo and enc = old.enc and tarea = old.tarea_actual;
        
        select json_encuesta  into
            v_json_encuesta
            from tem 
            where operativo = old.operativo and enc = old.enc;

        insert into historial_tem (operativo, enc, orden, tarea, estado, verificado, ts_salida, recepcionista, asignado, json_encuesta, resumen_estado, resumen_estado_sup, rea, norea, rea_sup, norea_sup) values 
            (old.operativo, old.enc, v_proximo_orden, old.tarea_actual, v_estado, v_verificado, current_timestamp, v_recepcionista, v_asignado, v_json_encuesta, v_dm_resumen_estado, v_dm_resumen_estado_sup, v_dm_rea, v_dm_norea, v_dm_rea_sup, v_dm_norea_sup);
    end if;
    return new;
end;
$BODY$;