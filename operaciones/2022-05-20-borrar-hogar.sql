--ejemplo para borrar hogar

set search_path= base, comun;
--hogares candidatos a borrar
select v.total_h, h.*, tt.tarea, tt.verificado,tt.obs_verificado 
from hogares h join viviendas v using (operativo, vivienda)
     join tem t on t.operativo=v.operativo and t.enc=v.vivienda
     join tareas_tem tt on tt.operativo=v.operativo and tt.enc=v.vivienda
where  entrea is null and f_realiz_o is null and prejue1 is null
    and razon1 is null -- y otras mas
    and hogar>1 and total_h=1
    and tt.obs_verificado~*'abiert'
    and jsonb_array_length(t.json_encuesta->'hogares')>1
order by vivienda, hogar;

-- viviendas con hogares a borrar
select enc, cant_h, json_encuesta->>'total_h',json_encuesta->'hogares'    
from tem
where enc in (select distinct v.vivienda--v.total_h, h.*, tt.tarea, tt.verificado,tt.obs_verificado 
    from hogares h join viviendas v using (operativo, vivienda)
         join tem t on t.operativo=v.operativo and t.enc=v.vivienda
         join tareas_tem tt on tt.operativo=v.operativo and tt.enc=v.vivienda
    where  entrea is null and f_realiz_o is null and prejue1 is null
        and razon1 is null -- y otras mas
        and hogar>1 and total_h=1
        and tt.obs_verificado~*'abiert'
        and jsonb_array_length(t.json_encuesta->'hogares')>1
    order by vivienda)
order by enc;

-- revisando como quedaria el json_encuesta al borrar
select enc, cant_h, json_encuesta->>'total_h',json_encuesta->'hogares' 
   , jsonb_set(json_encuesta, '{"hogares"}', (json_encuesta->'hogares')-1) json_encuesta_new
from tem
where enc='26207';

-- se resta el hogar que se quiere borrar, poniendo hogar-1
update tem
  set json_encuesta=jsonb_set(json_encuesta, '{"hogares"}', (json_encuesta->'hogares')-1)
  where enc='26207' and jsonb_array_length(json_encuesta->'hogares')>1 ;

delete from hogares where operativo='PREJU_2022' and vivienda='26207' AND hogar=2;