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
    v_permite_asignar boolean;
    v_estado_al_asignar text;
    v_tarea_inicial text;
begin
    select tarea_actual, habilitada into v_tarea_actual, v_habilitada
        from tem 
        where operativo = new.operativo and enc = new.enc;
    select permite_asignar, estado_al_asignar into v_permite_asignar, v_estado_al_asignar
        from estados
        where operativo = new.operativo and estado =  new.estado;
    select tarea into v_tarea_inicial
        from tareas 
        where operativo = new.operativo and es_inicial;
    if v_habilitada then
        if old.asignado is distinct from new.asignado then 
            if not v_permite_asignar then
                raise exception 'Error: no es posible asignar en la encuesta % del operativo % ya que su estado no lo permite', new.enc, new.operativo;
            end if;
            if new.recepcionista is null then 
                raise exception 'Error: no es posible asignar en la encuesta % del operativo % ya que no se indicó un/a recepcionista', new.enc, new.operativo;
            end if;
            if not (new.tarea = coalesce(v_tarea_actual,'nulo') or new.tarea = v_tarea_inicial) then
                raise exception 'Error: no es posible modificar la encuesta % del operativo % ya que la tarea actual definida en TEM no coincide con la tarea %', new.enc, new.operativo, new.tarea;
            end if;
        end if;
        if old.recepcionista is distinct from new.recepcionista then
            if new.recepcionista is null and new.asignado is not null then 
                raise exception 'Error: no es posible quitar el recepcionista de la encuesta % del operativo % ya que se la misma se encuentra asignada', new.enc, new.operativo;
            end if;
        end if;
        if old.asignado is distinct from new.asignado then
            if new.asignado is null then
                new.estado = '0D';
            else
                --if v_tarea_actual is distinct from new.tarea then    
                    if v_estado_al_asignar is not null then
                        new.estado = v_estado_al_asignar;
                    end if;
                --end if;
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
