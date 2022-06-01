set search_path = base;

set role  preju2022_owner;

/*
with x as(
select enc, area, v.consistido, modificado, t.rea, count(c.consistencia) cant_inconsist_null
  from tem t left join viviendas v on v.vivienda=t.enc 
    join inconsistencias c on c.vivienda=t.enc and justificacion is null
  where v.consistido is not null --and modificado is not null  
group by 1,2,3,4,5    
) select  x.enc, x.rea,  cant_inconsist_null n_inc
    , jsonb_object_agg(ta.tarea,ta.asignante order by tt.tarea) asignantet
    , jsonb_object_agg(tt.tarea,tt.asignado order by tt.tarea) asignadot
    , jsonb_object_agg(tt.tarea,tt.cargado order by tt.tarea) cargadot
    , jsonb_object_agg(tt.tarea,tt.fecha_asignacion order by tt.tarea) fecha_asigt
    , jsonb_object_agg(tt.tarea,tt.verificado order by tt.tarea) verificadot
    , jsonb_object_agg(tt.tarea,tt.obs_verificado order by tt.tarea) obs_verificadot
    , consistido
    , modificado
    ,sum(cant_inconsist_null)over() itotal
from x join tareas_tem tt on tt.enc= x.enc 
    join tareas_areas ta on tt.operativo= ta.operativo and tt.tarea=ta.tarea and x.area=ta.area
where --consistido>modificado and 
--ta.asignante is not null and 
cant_inconsist_null>0 --and tt.verificado='1'
--and tt.cargado_dm is null
group by 1,2,3,10,11
order by 1,2,3;
*/
----------------2
with x as(
select enc, area, v.consistido, modificado, t.rea, t.resumen_estado, count(c.consistencia) cant_inconsist_null
  from tem t left join viviendas v on v.vivienda=t.enc 
    join inconsistencias c on c.vivienda=t.enc and justificacion is null
  where v.consistido is not null --and modificado is not null  
group by 1,2,3,4,5,6    
), a as (
select  x.enc, x.rea, x.resumen_estado, cant_inconsist_null n_inc
    , jsonb_object_agg(ta.tarea,ta.asignante order by tt.tarea) asignantet
    , jsonb_object_agg(tt.tarea,tt.asignado order by tt.tarea) asignadot
    , jsonb_object_agg(tt.tarea,tt.cargado order by tt.tarea) cargadot
    , jsonb_object_agg(tt.tarea,tt.fecha_asignacion order by tt.tarea) fecha_asigt
    , jsonb_object_agg(tt.tarea,tt.verificado order by tt.tarea) verificadot
    , jsonb_object_agg(tt.tarea,tt.obs_verificado order by tt.tarea) obs_verificadot
    , consistido
    , modificado
    ,sum(cant_inconsist_null)over() itotal
from x join tareas_tem tt on tt.enc= x.enc 
    join tareas_areas ta on tt.operativo= ta.operativo and tt.tarea=ta.tarea and x.area=ta.area
where --consistido>modificado and 
--ta.asignante is not null and 
cant_inconsist_null>0 --and tt.verificado='1'
--and tt.cargado_dm is null
group by 1,2,3,4,11,12
)
select enc, rea, resumen_estado resumene, n_inc
    , asignantet->>'encu' rece_e
    , asignadot->>'encu'  encu
    , cargadot->>'encu'   carg_e
    , fecha_asigt->>'encu' fasig_e
    , verificadot->>'encu'verif_e
    , obs_verificadot->>'encu'overif_e
    , asignantet->>'recu' rece_r
    , asignadot->>'recu'  recu
    , cargadot->>'recu'   carg_r
    , fecha_asigt->>'recu' fasig_r
    , verificadot->>'recu'verif_r
    , obs_verificadot->>'recu'overif_r
    , asignantet->>'supe' rece_s
    , asignadot->>'supe'  supe
    , cargadot->>'supe'   carg_s
    ,fecha_asigt->>'supe' fasig_s
    , verificadot->>'supe'verif_s
    , obs_verificadot->>'supe'overif_s
    , itotal
    into enc_revision_inconsist_220531
    from a
order by rece_e, enc;    

select consistencia, count(*)--, sum(count(*)) over(partition by null)
from inconsistencias join consistencias using (operativo, consistencia)
group by 1
order by count(*) desc;