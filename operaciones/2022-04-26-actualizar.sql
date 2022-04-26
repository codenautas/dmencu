set role to discon_owner;
--set role to dmencu_owner;
--set role to preju_capa2022_owner;
--set role to preju2022_owner;
--set role to preju_test2022_owner;
set search_path=base;

alter table tem add column fin_campo text;
alter table tem add column pase_tabla text;

alter table "tem" add constraint "fin_campo<>''" check ("fin_campo"<>'');
alter table "tem" add constraint "pase_tabla<>''" check ("pase_tabla"<>'');



