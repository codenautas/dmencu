--set role dmencu_owner;
--set search_path=base;

DROP FUNCTION if exists asignar_desasignar_tareas_tem_trg();
CREATE OR REPLACE FUNCTION asignar_desasignar_tareas_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
    declare 
        v_estado_al_asignar text;
        v_tarea_actual  text;
        v_tarea_proxima text;
begin
    select tarea_actual, habilitada, tarea_proxima into v_tarea_actual, v_tarea_proxima
        from tem 
        where operativo = new.operativo and enc = new.enc;
    select estado_al_asignar into v_estado_al_asignar from estados where operativo = new.operativo and estado = new.estado;
    if new.asignado is not null then
        if v_tarea_actual is distinct from new.tarea then    
            if v_estado_al_asignar is not null then
                new.estado = v_estado_al_asignar;
            end if;
            update tem 
                set tarea_actual = tarea_proxima, tarea_proxima = null 
                where operativo = new.operativo and enc = new.enc;
        end if;
    else
        --new.estado = '0D';
    end if;
        --si asigna persona y antes no habia y el estado in (0D) está ok -> pasa a A
        --si cambia persona y el estado in (A, ACD, ACP) está ok -> mantiene estado (definir si se puede cambiar el asignado desde recepcion)
        --si asigna persona y el estado not in  (0D, A, ACD, ACP) no lo dejas cambiar
    return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS asignar_desasignar_tareas_tem_trg ON tareas_tem;
CREATE TRIGGER asignar_desasignar_tareas_tem_trg
   AFTER UPDATE OF asignado
   ON tareas_tem
   FOR EACH ROW
   EXECUTE PROCEDURE asignar_desasignar_tareas_tem_trg();   
