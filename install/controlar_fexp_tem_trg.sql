--set role dmencu_owner;
--set search_path=base;

set search_path = base;

-- Una encuesta sin rea positiva (no respuesta) no lleva factor de expansión. Se controla al cargar o cambiar fexp
-- (grilla tem_factores, importación o cualquier otro update), no al cambiar la rea.
CREATE OR REPLACE FUNCTION controlar_fexp_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
begin
    if tg_op = 'UPDATE' and old.fexp is not distinct from new.fexp then
        return new;
    end if;
    if not exists (select 1 from rea r where r.operativo = new.operativo and r.rea = new.rea and r.es_positiva) then
        if tg_op = 'INSERT' then
            raise exception 'Error: la encuesta % del operativo % no existe; no se puede crear con factor de expansión sin rea positiva', new.enc, new.operativo;
        else
            raise exception 'Error: la encuesta % del operativo % no tiene rea positiva, no puede tener factor de expansión', new.enc, new.operativo;
        end if;
    end if;
    return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS controlar_fexp_tem_trg ON tem;
CREATE TRIGGER controlar_fexp_tem_trg
   BEFORE INSERT OR UPDATE OF fexp
   ON tem
   FOR EACH ROW
   WHEN (new.fexp is not null)
   EXECUTE PROCEDURE controlar_fexp_tem_trg();
