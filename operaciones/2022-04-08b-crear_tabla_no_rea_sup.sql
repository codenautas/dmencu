set role dmencu_owner; --discon_owner depende el entorno
set search_path=base;
create table "no_rea_sup" (
  "no_rea_sup" text, 
  "desc_norea_sup" text, 
  "grupo_sup" text, 
  "variable_sup" text, 
  "valor_sup" text, 
  "grupo0_sup" text
, primary key ("no_rea_sup")
);
grant select, insert, update, delete on "no_rea_sup" to discon_admin;
grant all on "no_rea_sup" to discon_owner;

alter table "no_rea_sup" add constraint "no_rea_sup<>''" check ("no_rea_sup"<>'');
alter table "no_rea_sup" add constraint "desc_norea_sup<>''" check ("desc_norea_sup"<>'');
alter table "no_rea_sup" add constraint "grupo_sup<>''" check ("grupo_sup"<>'');
alter table "no_rea_sup" add constraint "variable_sup<>''" check ("variable_sup"<>'');
alter table "no_rea_sup" add constraint "valor_sup<>''" check ("valor_sup"<>'');
alter table "no_rea_sup" add constraint "grupo0_sup<>''" check ("grupo0_sup"<>'');

do $SQL_ENANCE$
 begin

PERFORM enance_table('no_rea_sup','no_rea_sup');

end
$SQL_ENANCE$;

