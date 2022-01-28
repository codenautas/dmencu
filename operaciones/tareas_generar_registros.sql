set search_path=base;
--set role dmencu_owner;

-- Primer seteo con data de asignacion desde areas
-- TODO reveer si agregamos campos asociados a las tareas supe y recu a areas

--delete from tareas_areas;
insert into tareas_areas(tarea, area, asignado, asignante, obs_asignante)
    select * 
        from (
          select tarea, area, relevador, recepcionista, obs_recepcionista
            from areas ,(select tarea from tareas where tarea ~'^(encu|rel)$')t
            union   
            select tarea, area, null, recepcionista, obs_recepcionista
            from areas ,(select tarea from tareas where tarea ~'^(supe|recu)')t
        ) n
        --where not exists (select 1 from tareas_areas t where t.tarea=n.tarea and t.area=n.area)
        order by 1,2;

--adecuar operativo xope
--delete from tareas_tem;
insert into tareas_tem (operativo, enc, tarea, habilitada, operacion, fecha_asignacion,asignado)
  select * 
    from (select operativo, enc, ta.tarea, case when ta.tarea='encu' then true else false end , operacion, fecha_asignacion,asignado
            from (select * from tareas ta, tem t) ta left join tareas_areas x on x.tarea=ta.tarea and x.area=ta.area
            where operativo= 'xope' and not (operativo, enc, ta.tarea) in (select operativo, enc, tarea from tareas_tem)
                and ta.main_form is not null
    ) x
    --where not exists(select 1 from tareas_tem t where t.operativo=x.operativo and t.tarea=x.tarea and t.enc=x.enc)            
    order by 1,3,2;	

--el trigger sincro_tareas_areas_tareas_tem_trg se ocupara de mantener actualizados los campos fecha_asignacion,operacion y asignado en tareas_tem