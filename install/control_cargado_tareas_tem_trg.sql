--set search_path = base;
--set role dmencu_owner;

CREATE OR REPLACE FUNCTION control_cargado_tareas_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
declare 
  cant_cargados integer;
  tarea_cargada text;
begin
    if new.operacion='cargar'  then
        select count(*), min(tarea) 
            into cant_cargados, tarea_cargada
            from tareas_tem tt join parametros using(operativo)
            where tt.enc=old.enc and tt.cargado_dm is not null and tt.tarea is distinct from new.tarea;
        if cant_cargados >0 then
            raise exception 'Error: la encuesta % ya esta cargada para la tarea %', old.enc, tarea_cargada;
        end if;
    end if;    
    return new;
end;
$BODY$;

CREATE TRIGGER control_cargado_tareas_tem_trg
    BEFORE UPDATE OF operacion
    ON tareas_tem
    FOR EACH ROW
    EXECUTE PROCEDURE control_cargado_tareas_tem_trg();
