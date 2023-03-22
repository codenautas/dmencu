set search_path=base;
--set role dmencu_owner;

-- Primer seteo con data de asignacion desde areas
-- TODO reveer si agregamos campos asociados a las tareas supe y recu a areas

--delete from tareas_areas;
insert into tareas_areas(operativo, tarea, area, asignado, asignante, obs_asignante)
    select * 
        from (
          select a.operativo, t.tarea, area, case when tarea='encu' then encuestador else null end asignado, recepcionista, obs_recepcionista
            from areas a ,(select t.operativo, t.tarea 
                from tareas t join parametros p on unico_registro and t.operativo=p.operativo
            )t
            where a.operativo= t.operativo
        ) n
        --where not exists (select 1 from tareas_areas t where t.operativo= n.operativo and t.tarea=n.tarea and t.area=n.area)
        order by 1,2,3;

--delete from tareas_tem;
insert into tareas_tem (operativo, enc, tarea, operacion, fecha_asignacion,asignado)
    select ta.operativo, ta.enc, ta.tarea, operacion, fecha_asignacion,asignado
      from (select ta.*, t.enc,t.area from tareas ta, tem t where ta.operativo=t.operativo) ta 
        left join tareas_areas x on x.operativo=ta.operativo and x.tarea=ta.tarea and x.area=ta.area
      where x.operativo= (select operativo from parametros where unico_registro) 
          and not (ta.operativo, ta.enc, ta.tarea) in (select operativo, enc, tarea from tareas_tem)
          and ta.main_form is not null
    order by 1,3,2;

--el trigger sincro_tareas_areas_tareas_tem_trg se ocupara de mantener actualizados los campos fecha_asignacion,operacion y asignado en tareas_tem