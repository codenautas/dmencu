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
        ,case when sum(jsonb_array_length(datos->'hogares'))>1
            then string_agg('h'||ordinality||':'||coalesce(elegido::text,'')||'-'||coalesce(case when elegido_excep then msnombre_excep else msnombre end),',' order by ordinality) 
            else min(elegido)||'-'||min(case when elegido_excep then msnombre_excep else msnombre end ) 
        end  as seleccionado
        into v_cant_p, v_seleccionado
        from (select * --ordinality, total_m, cr_num_miembro,cr_num_miembro_ing ,msnombre, personas
            ,coalesce(cr_num_miembro_ing::integer, cr_num_miembro) elegido
            ,case when (new.dominio=5 or (datos?'soporte' and (datos->>'soporte')='1' )) and cr_num_miembro_ing is not null  then true else null end elegido_excep
            ,case when (personas->(cr_num_miembro_ing::integer-1))?'nombre' then (personas->cr_num_miembro_ing-1)->>'nombre'  else null end msnombre_excep
            from rows from (jsonb_to_recordset(datos->'hogares')  as (total_m integer, cr_num_miembro integer, cr_num_miembro_ing integer,msnombre text, personas jsonb)
            ) with ordinality  
                    as hogares (total_m, cr_num_miembro, cr_num_miembro_ing, msnombre, personas)
        ) hogares_plus;

    new.cant_h       = (datos ->>'total_h') ::integer ;
    --new.cant_h       = jsonb_array_length(datos ->'hogares');

    new.cant_p       = v_cant_p ;
    new.seleccionado = v_seleccionado;
    if old.json_encuesta is distinct from datos then
        new.modificado= current_timestamp;
    end if;

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
