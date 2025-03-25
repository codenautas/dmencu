set search_path = base;
--ojo el admin y el owner

set search_path = base;
create table "momentos_consistencia" (
  "operativo" text, 
  "momento" text, 
  "descripcion" text
, primary key ("operativo", "momento")
);
grant select, insert, update, delete on "momentos_consistencia" to esede241_admin;
grant all on "momentos_consistencia" to esede241_owner;

alter table "momentos_consistencia" add constraint "operativo<>''" check ("operativo"<>'');
alter table "momentos_consistencia" add constraint "momento<>''" check ("momento"<>'');
alter table "momentos_consistencia" add constraint "descripcion<>''" check ("descripcion"<>'');

update consistencias set momento = 'recep';

insert into momentos_consistencia (operativo,momento,descripcion) values ('esede241','recep','consistencias de recepción');

alter table "consistencias" add constraint "consistencias momentos_consistencia REL" foreign key ("operativo", "momento") references "momentos_consistencia" ("operativo", "momento")  on update cascade;

alter table "momentos_consistencia" add column "condicion" text default true;
alter table "momentos_consistencia" add constraint "condicion<>''" check ("condicion"<>'');
alter table "momentos_consistencia" alter column "condicion" set not null;

CREATE OR REPLACE FUNCTION momento_consistencia_cumple_condicion(p_operativo text, p_enc text, p_usuario text, p_condicion text)
RETURNS boolean AS
$BODY$
DECLARE
    v_sent text; 
    v_cond text;
    v_salida integer;
BEGIN
 v_cond=p_condicion;
 v_sent='select 1
   from usuarios u, tem t
   where u.usuario = '||quote_literal(p_usuario)|| 
   ' and t.operativo = '||quote_literal(p_operativo)||
   ' and t.enc = '||quote_literal(p_enc)||
   ' and '||v_cond||';';
 --raise notice 'esto %',vsent;
 execute v_sent into v_salida;
 IF v_salida=1 THEN
    return true;
 ELSE
    return false;
 END IF;

END;
$BODY$
 LANGUAGE plpgsql VOLATILE;