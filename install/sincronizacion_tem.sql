--set role to preju2022_owner;
--set search_path = base;

CREATE OR REPLACE FUNCTION sincronizacion_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
declare
  datos           jsonb=new.json_encuesta;
  v_cant_p        integer;
  v_seleccionado  text;
begin
       
    select sum (total_m) as cant_p--sum(jsonb_array_length(personas))
        ,case when sum(jsonb_array_length(datos->'hogares'))>1 then string_agg('h'||ordinality||':'||coalesce(cr_num_miembro::text,'')||'-'||coalesce(msnombre),',') 
            else min(cr_num_miembro)||'-'||min(msnombre) 
        end  as seleccionado
        into v_cant_p, v_seleccionado
        from rows from (jsonb_to_recordset(datos->'hogares')  as (total_m integer, cr_num_miembro integer, msnombre text, personas jsonb)
        ) with ordinality  as hogares (total_m, cr_num_miembro,msnombre, personas); 

    new.cant_h       = (datos ->>'total_h') ::integer ;
    --new.cant_h       = jsonb_array_length(datos ->'hogares');

    new.cant_p       = v_cant_p ;
    new.seleccionado = v_seleccionado;
    return new;
end;
$BODY$;

-- /*
CREATE TRIGGER sincronizacion_tem_trg
  BEFORE INSERT OR UPDATE OF json_encuesta, obs
  ON tem
  FOR EACH ROW
  EXECUTE PROCEDURE sincronizacion_tem_trg();

-- */

/*
--para forzar sincro
update tem
set obs=obs 
where json_encuesta is not null;
*/
