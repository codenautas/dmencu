--set role dmencu_owner;
--set search_path=base;

DROP FUNCTION if exists asignar_desasignar_tareas_tem_trg();
CREATE OR REPLACE FUNCTION asignar_desasignar_tareas_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
begin
    --pensar si va una guarda
    --habilitado (new.habilitado)
        --si asigna persona y antes no habia y el estado in (0D) está ok -> pasa a A
        --si cambia persona y el estado in (A, ACD, ACP) está ok -> mantiene estado (definir si se puede cambiar el asignado desde recepcion)
        --si asigna persona y el estado not in  (0D, A, ACD, ACP) no lo dejas cambiar
    --si no está habilitado (new.habilitado es false) 
        --si old.asignado <> new.asignadono deja asignar
        --return new        
    



    --if old.asignado is null and new.asignado is not null or
    --not old.habilitada = new.habilitada then
    --    if new.asignadonew.estado = 'A'
    --else

    --end if;
end;
$BODY$;

DROP TRIGGER IF EXISTS asignar_desasignar_tareas_tem_trg ON tareas_tem;
CREATE TRIGGER asignar_desasignar_tareas_tem_trg
   BEFORE UPDATE OF habilitado, asignado
   ON tareas_tem
   FOR EACH ROW
   EXECUTE PROCEDURE asignar_desasignar_tareas_tem_trg();   
