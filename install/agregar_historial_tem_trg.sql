--set role dmencu_owner;
--set search_path=base;
--DROP FUNCTION if exists agregar_historial_tem_trg();
CREATE OR REPLACE FUNCTION agregar_historial_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
    declare
        v_proximo_orden integer;
        v_recepcionista text;
        v_asignado text;
        v_json_encuesta jsonb;
        v_resumen_estado text;
        v_resumen_estado_sup text;
        v_rea integer;
        v_norea integer;
        v_rea_sup integer;
        v_norea_sup integer;
begin
    if old.tarea_actual is distinct from new.tarea_actual and new.tarea_actual is not null and old.tarea_actual is not null then
        select coalesce(max(orden),0)+1 into v_proximo_orden
            from historial_tem 
            where operativo = old.operativo and enc = old.enc;
        
        select recepcionista, asignado, resumen_estado, resumen_estado_sup, rea, norea, rea_sup, norea_sup  into
            v_recepcionista, v_asignado, v_resumen_estado, v_resumen_estado_sup, v_rea, v_norea, v_rea_sup, v_norea_sup 
            from tareas_tem 
            where operativo = old.operativo and enc = old.enc and tarea = old.tarea_actual;
        
        select json_encuesta  into
            v_json_encuesta
            from tem 
            where operativo = old.operativo and enc = old.enc;

        insert into historial_tem (operativo, enc, orden, tarea, estado, ts_salida, recepcionista, asignado, json_encuesta, resumen_estado, resumen_estado_sup, rea, norea, rea_sup, norea_sup) values 
            (old.operativo, old.enc, v_proximo_orden, old.estado, old.tarea_actual, current_timestamp, v_recepcionista, v_asignado, v_json_encuesta, v_resumen_estado, v_resumen_estado_sup, v_rea, v_norea, v_rea_sup, v_norea_sup);
    end if;
    return new;
end;
$BODY$;


DROP TRIGGER IF EXISTS agregar_historial_tem_trg ON tem;
CREATE TRIGGER agregar_historial_tem_trg
   AFTER UPDATE OF tarea_actual
   ON tem
   FOR EACH ROW
   EXECUTE PROCEDURE agregar_historial_tem_trg();   
