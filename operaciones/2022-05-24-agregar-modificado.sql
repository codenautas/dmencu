set role preju2022_owner;
--CAMBIAR ROL  de acuerdo al entorno
-- REEMPLAZAR TAMBIENA EL OWNER
set search_path=base;
alter table tem add column modificado timestamp;

-- actualizar trigger sincronizacion_tem_trg de operaciones/

-- inicializar modificado
with modif as (
select enc, max(cha_when) modif from tem t , his.changes c  
where json_encuesta is not null and cha_table='tem' and cha_column='json_encuesta' and cha_new_pk->>'enc'=t.enc 
group by 1
    )
update tem t set modificado=modif
from modif
where t.enc=modif.enc and t.modificado is null;
