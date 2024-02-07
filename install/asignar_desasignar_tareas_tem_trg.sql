--set role dmencu_owner;
--set search_path=base;

--DROP FUNCTION if exists asignar_desasignar_tareas_tem_trg();
CREATE OR REPLACE FUNCTION asignar_desasignar_tareas_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
    declare 
        v_estado_al_asignar text;
        v_tarea_actual  text;
        v_tarea_inicial text;
begin
    select tarea_actual into v_tarea_actual
        from tem 
        where operativo = new.operativo and enc = new.enc;
    select estado_al_asignar into v_estado_al_asignar from estados where operativo = new.operativo and estado = new.estado;
    select tarea into v_tarea_inicial
        from tareas 
        where operativo = new.operativo and es_inicial;
    if new.asignado is null then
        if new.tarea = v_tarea_inicial then
            update tem 
                set tarea_actual = null
                where operativo = new.operativo and enc = new.enc;
        end if;
    else
        if v_tarea_actual is null and v_tarea_actual is distinct from new.tarea then    
            update tem 
                set tarea_actual = v_tarea_inicial
                where operativo = new.operativo and enc = new.enc;
        end if;
    end if;
    return new;
end;
$BODY$;

--DROP TRIGGER IF EXISTS asignar_desasignar_tareas_tem_trg ON tareas_tem;
CREATE TRIGGER asignar_desasignar_tareas_tem_trg
   AFTER UPDATE OF asignado
   ON tareas_tem
   FOR EACH ROW
   EXECUTE PROCEDURE asignar_desasignar_tareas_tem_trg();   
