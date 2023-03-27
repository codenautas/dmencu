--set role dmencu_owner;
--set search_path=base;

DROP FUNCTION if exists permite_modificar_tareas_tem_trg();
CREATE OR REPLACE FUNCTION permite_modificar_tareas_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
declare 
    v_habilitada    boolean;
    v_tarea_actual  text;
    v_tarea_proxima text;
    v_permite_asignar boolean;
begin
    select tarea_actual, habilitada, tarea_proxima into v_tarea_actual, v_habilitada, v_tarea_proxima
        from tem 
        where operativo = new.operativo and enc = new.enc;
     select permite_asignar into v_permite_asignar
        from estados
        where operativo = new.operativo and estado =  new.estado;
    if v_habilitada then
        if not (old.asignado <> new.asignado and v_permite_asignar) then 
            raise exception 'Error: no es posible asignar en la encuesta % del operativo % ya que su estado no lo permite', new.enc, new.operativo;
        end if;
        if not (new.tarea = v_tarea_actual or old.asignado <> new.asignado and new.tarea = v_tarea_proxima) then
            raise exception 'Error: no es posible modificar la encuesta % del operativo % ya que la tarea actual definidar en TEM no coincide con la tarea %', new.enc, new.operativo, new.tarea;
        end if;
    else
        raise exception 'Error: la encuesta % del operativo % se encuentra deshabilitada', new.enc, new.operativo;
    end if;
    return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS permite_modificar_tareas_tem_trg ON tareas_tem;
CREATE TRIGGER permite_modificar_tareas_tem_trg
   BEFORE UPDATE
   ON tareas_tem
   FOR EACH ROW
   EXECUTE PROCEDURE permite_modificar_tareas_tem_trg();   
