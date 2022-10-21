--set search_path = base;
--set role dmencu_owner;

CREATE OR REPLACE FUNCTION control_cargado_tareas_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
declare 
    cant_cargado  integer;
    tarea_cargado text;
    cant_cargar   integer;
    tarea_cargar  text;
begin
    if new.operacion='cargar'  then
        select count(*)filter (where tt.cargado_dm is not null), min(tarea) filter (where tt.cargado_dm is not null)
             , count(*)filter (where tt.operacion='cargar'), min(tarea) filter (where tt.operacion='cargar')
            into cant_cargado, tarea_cargado,cant_cargar,tarea_cargar
            from tareas_tem tt join parametros using(operativo)
            where tt.enc=old.enc and tt.tarea is distinct from new.tarea
                and unico_registro;
        if cant_cargado >0 then
            raise exception 'Error: la encuesta % ya esta cargada en dm para la tarea %', old.enc, tarea_cargada;
        end if;
        if cant_cargar >0 then
            raise exception 'Error: la encuesta % ya tiene operacion cargar para la tarea %', old.enc, tarea_cargar;
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
