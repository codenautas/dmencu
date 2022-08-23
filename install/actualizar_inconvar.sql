set search_path= base;

CREATE OR REPLACE FUNCTION actualizar_inconvar_trg()
  RETURNS trigger AS
$BODY$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    delete from in_con_var where operativo=new.operativo and  pk_integrada=new.pk_integrada and consistencia=new.consistencia;
    insert into in_con_var(operativo, consistencia, pk_integrada, variable, tabla_datos, valor)
      select new.operativo, new.consistencia, new.pk_integrada, split_part(key, '.', 2 ) as variable, split_part(key, '.', 1) as tabla_datos, value as valor 
        from jsonb_each_text(new.incon_valores) ; 
    return new;      
  end if;       
  if tg_op = 'DELETE' then
    delete from in_con_var where operativo=old.operativo and  pk_integrada=old.pk_integrada and consistencia=old.consistencia;
    return old;  
  else
    return new; 
  end if;
end;
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

--DROP TRIGGER actualizar_inconvar_trg ON inconsistencias;
CREATE TRIGGER actualizar_inconvar_trg
  BEFORE INSERT OR DELETE OR UPDATE OF incon_valores
  ON inconsistencias
  FOR EACH ROW
  EXECUTE PROCEDURE actualizar_inconvar_trg();  