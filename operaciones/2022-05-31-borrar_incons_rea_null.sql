set search_path= base;
set role preju2022_owner;

-- correr despues de consistir todas las encuestas
-- encuestas consistidas, rea nula, dado que no se consisten desde la grillas tem, tareas_tem
select enc, rea, norea, consistencia
from  tem t join inconsistencias i on i.vivienda=t.enc
where rea is null 
order by 1,4;

delete from inconsistencias i
where exists (select enc from tem where rea is null and enc=vivienda);
--0
--no hay casos a borrar en produccion



