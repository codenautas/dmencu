--set role dmencu_owner;
set role to ut2023_muleto_owner;
set search_path=base;

DROP FUNCTION if exists usuarios_trg();
set search_path = base;

CREATE OR REPLACE FUNCTION usuarios_trg()
  RETURNS trigger
  LANGUAGE 'plpgsql'
AS $BODY$
declare
  v_rol_usuario_actual text;
  v_puede_asignar_rol boolean;
begin
  if new.rol is distinct from old.rol then
    select rol
      into v_rol_usuario_actual
      from usuarios
      where usuario = split_part(current_setting('application_name'),' ',1);
    select true 
      into v_puede_asignar_rol
      from roles_subordinados
      where rol = v_rol_usuario_actual and rol_subordinado = new.rol;
    if v_puede_asignar_rol or v_rol_usuario_actual = 'admin' then
      null; 
    else 
      raise exception 'No se peude asignar el rol %', new.rol;
    end if;
  end if;
  return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS usuarios_trg ON usuarios;
CREATE TRIGGER usuarios_trg
  BEFORE UPDATE OR INSERT
  ON usuarios
  FOR EACH ROW
  EXECUTE PROCEDURE usuarios_trg();   

