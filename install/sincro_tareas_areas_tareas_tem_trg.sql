--set role dmencu_owner;
--set search_path=base;

DROP FUNCTION if exists sincro_tareas_areas_tareas_tem_trg();
CREATE OR REPLACE FUNCTION sincro_tareas_areas_tareas_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql' 
AS $BODY$
begin
    update tareas_tem tt
        set asignado      = case when new.asignado      is not null and new.asignado      is distinct from old.asignado      then new.asignado      else asignado      end,
            recepcionista = case when new.recepcionista is not null and new.recepcionista is distinct from old.recepcionista then new.recepcionista else recepcionista end
        from tem t   
        where tt.operativo=t.operativo 
            and tt.enc=t.enc 
            and tt.tarea=new.tarea
            and t.area=new.area;            
    return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS sincro_tareas_areas_tareas_tem_trg ON tareas_areas;
CREATE TRIGGER sincro_tareas_areas_tareas_tem_trg
   AFTER INSERT OR UPDATE OF recepcionista, asignado
   ON tareas_areas
   FOR EACH ROW
   EXECUTE PROCEDURE sincro_tareas_areas_tareas_tem_trg();   
