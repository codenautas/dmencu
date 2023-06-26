set role ut2023_owner; --poner el usuario que corresponda al entorno
set search_path=base;
alter table tem add column result_sup integer;
alter table tem add constraint vresult_sup_ck check (result_sup between 1 and 9 or result_sup in (11,12,21,22 ) or result_sup between 60 and 68);