--ejemplo para borrar hogar

set search_path= base, comun;
select * from hogares
where observaciones is null and entrea is null and f_realiz_o is null and prejue1 is null
    and razon1 is null -- y otras mas
    and hogar>1
order by vivienda, hogar;

select enc, cant_h, json_encuesta->>'total_h',json_encuesta->'hogares' 
   , jsonb_set(json_encuesta, '{"hogares"}', (json_encuesta->'hogares')-1) json_encuesta_new
from tem
where enc='26207';

-- se resta el hogar que se quiere borrar, poniendo hogar-1
update tem
  set json_encuesta=jsonb_set(json_encuesta, '{"hogares"}', (json_encuesta->'hogares')-1)
  where enc='26207';

