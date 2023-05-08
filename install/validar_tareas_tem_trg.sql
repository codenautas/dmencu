--set role dmencu_owner;
--set search_path=base;

DROP FUNCTION if exists validar_tareas_tem_trg();
set search_path = base;

CREATE OR REPLACE FUNCTION validar_tareas_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
declare 
    v_habilitada    boolean;
    v_tarea_actual  text;
    v_tarea_proxima text;
    v_permite_asignar boolean;
    v_estado_al_asignar text;
begin
    select tarea_actual, habilitada, tarea_proxima into v_tarea_actual, v_habilitada, v_tarea_proxima
        from tem 
        where operativo = new.operativo and enc = new.enc;
    select permite_asignar, estado_al_asignar into v_permite_asignar, v_estado_al_asignar
        from estados
        where operativo = new.operativo and estado =  new.estado;
    if v_habilitada then
        if old.asignado is distinct from new.asignado and not v_permite_asignar then 
            raise exception 'Error: no es posible asignar en la encuesta % del operativo % ya que su estado no lo permite', new.enc, new.operativo;
        end if;
        if old.recepcionista_tarea is distinct from new.recepcionista_tarea and not v_permite_asignar then 
            raise exception 'Error: no es posible modificar recepcionista en la encuesta % del operativo % ya que su estado no lo permite', new.enc, new.operativo;
        end if;
        if not (new.tarea = coalesce(v_tarea_actual,'nulo') or 
            ((old.asignado is distinct from new.asignado) or (old.recepcionista_tarea is distinct from new.recepcionista_tarea)) 
            and new.tarea = coalesce(v_tarea_proxima,'nulo')) then
                raise exception 'Error: no es posible modificar la encuesta % del operativo % ya que la tarea actual definida en TEM no coincide con la tarea %', new.enc, new.operativo, new.tarea;
        end if;
        if old.asignado is distinct from new.asignado then
            if new.asignado is null then
                new.estado = '0D';
            else
                if v_tarea_actual is distinct from new.tarea then    
                    if v_estado_al_asignar is not null then
                        new.estado = v_estado_al_asignar;
                        new.tarea_anterior = v_tarea_actual;
                    end if;
                end if;
            end if;
        end if;
    else
        raise exception 'Error: la encuesta % del operativo % se encuentra deshabilitada', new.enc, new.operativo;
    end if;
    return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS validar_tareas_tem_trg ON tareas_tem;
CREATE TRIGGER validar_tareas_tem_trg
   BEFORE UPDATE
   ON tareas_tem
   FOR EACH ROW
   EXECUTE PROCEDURE validar_tareas_tem_trg();   
