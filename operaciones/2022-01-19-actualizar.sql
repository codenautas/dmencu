set search_path=base;
alter table casilleros add column es_activo boolean default true;
insert into tipoc(tipoc, denominacion, irrepetible, desp_casillero, desp_hijos, puede_ser_var)
    values ('FIN', 'fin', true, null, null, false);