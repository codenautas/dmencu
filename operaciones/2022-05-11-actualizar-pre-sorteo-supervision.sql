set role preju2022_owner;
--set role preju_test2022_owner;
--set role preju_capa_2022_owner;
--set role discon_owner;;
--set role dmencu_owner;
--set role discon_owner;
set search_path=base;
 
alter table tem add column pre_sorteo integer;
alter table tem add column supervision_dirigida integer;
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
where t.enc=b.enc and t.operativo='PREJU_2022'

select pre_sorteo   
  from tem
  where pre_sorteo=1;
