
--listado de edificios con viviendas seleccionadas en areas no villa donde rea_m<=4
with ar as (
  select a.area, count(t.rea_m) 
    from tem t join areas a using (area)
    where t.tipo_domicilio is distinct from 3 
    group by 1
    having count(t.rea_m)<=4
), viv as (
  select t.enc, t.nrocomuna, t.area, t.nomcalle, t.nrocatastral, t.piso, t.departamento, t.rea_m,t.reserva, t.habilitada
  from tem t join ar a using (area)
  where t.piso is not null 
  order by t.nrocomuna, t.area, t.nomcalle,t.nrocatastral,t.piso, t.departamento
)
select nrocomuna,area, nomcalle,nrocatastral,count(*) vivs    --, count(case when rea_m=1 then 1 else null end ) vivs_rea
from viv
where rea_m is distinct from 1
group by 1,2,3,4
order by 1,2,3,4;

/* 
select nrocomuna,area, nomcalle,nrocatastral,t.piso, t.departamento
from viv
where rea_m is distinct from 1
order by 1,2,3,4,5,6;
--orden??
*/