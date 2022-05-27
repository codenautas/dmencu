set role preju2022_owner;
--set role preju_test2022_owner;
--set role preju_capa_2022_owner;
--set role discon_owner;;
--set role dmencu_owner;
--set role discon_owner;
set search_path=base;
/* --primer parte ya está ejecutada en producción
alter table tem add column pre_sorteo integer;
alter table tareas_tem add column supervision_dirigida integer;
alter table tem add column supervision_aleatoria integer;
alter table tem add column supervision integer; --se activa con el valor de pre_sorteo si se dan las condiciones
select count(*) from tem where dominio=3 and operativo='PREJU_2022'; 
with a as(
select enc,random() vrandom
from tem
where dominio=3 and operativo='PREJU_2022'
order by enc
    )
update tem  t set pre_sorteo=b.pre_sorteo
from (
select enc, case when vrandom <=0.1 then 1 else 0 end as pre_sorteo --asi da el 10% de elegidas (con valor 1)
from a
    ) b
where t.enc=b.enc and t.operativo='PREJU_2022';
*/
/*
select pre_sorteo
  from tem
  where pre_sorteo=1;
*/

--segunda parte Pre-sorteo
--pre_sorteo=1 van a  ser supervisiones presenciales
update tem t set supervision_aleatoria=1 where pre_sorteo=1;

--pre_sorteo=2 van a  ser supervisiones telefonicas
with a as(
select enc,random() vrandom
from tem
where dominio=3 and operativo='PREJU_2022' and pre_sorteo=0
order by enc
    )
update tem  t set pre_sorteo=b.pre_sorteo
from (
select enc, case when vrandom <=0.1 then 2 else 0 end as pre_sorteo --asi da el 10% de elegidas (con valor 1)
from a
    ) b
where t.enc=b.enc and t.operativo='PREJU_2022';

update tem t set supervision_aleatoria=2 where pre_sorteo=2 and operativo='PREJU_2022';

----saco supervision_aleatoria telefónica a aquellos que no tienen telefono o tienen norea porque alli tiene que ser presencial
----y les coloco pre_sorteo=3

 --select t.enc, t.pre_sorteo,x.telefono from tem t,
update tem t set (supervision_aleatoria, pre_sorteo)=(null, 3)
  from 
  (select  norea ,/*,asignado,tarea,*/ vivienda,
       case  when
          concat_ws('x', string_agg('h'||hogar||' '||fijo ,',' order by hogar),
                   string_agg('h'||hogar||' '||movil,',' order by hogar) ) ='' then 'sin_telefono' else 'con_telefono' end as telefono
                                           from hogares
     inner join tareas_tem tt on tt.enc=vivienda  and asignado is not null
     and tt.norea is not null
     group by 1,2
     )x
   where operativo='PREJU_2022' and pre_sorteo=2 and t.enc=x.vivienda and t.dominio=3
        and telefono='sin_telefono';


--valores pre_sorteo
 -- 1: 10% de la muestra elegida como presencial
 -- 2: 10% de la muestra elegida como telefónica
 -- 3: de las telefónicas aleatorias, son aquellas que observamos que no tienen teléfono, o que son noreas entonces se sacan de la supervisión telefónica 
 
 --
 ---- control 
 /*  
 select pre_sorteo, count(*)  
   from tem
   where dominio=3
 group by pre_sorteo
 order by pre_sorteo;
 */     
--valores supervision_aleatoria
--1 presencial
--2 telefonica