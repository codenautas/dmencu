--ejemplo actualizar un valor (en ese caso a null) dentro de jsonb

set role usuario_owner;
set search_path=base;  
select enc,cant_h,json_encuesta#>('{personas,3,ac3}'),
       json_encuesta#>('{personas,3,nombre}') nombre,
       jsonb_set(json_encuesta,'{personas,3,ac3}', 'null'::jsonb) as resultado 
    from tem
    where enc='xxxxx'
update tem
   set json_encuesta=jsonb_set(json_encuesta,'{personas,3,ac3}', 'null'::jsonb)
   where enc='xxxxx'; 