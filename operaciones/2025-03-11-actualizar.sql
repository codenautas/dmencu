set role to dmencu_owner; --cambiar owner de acuerdo a la instancia
set search_path = base;
ALTER TABLE IF EXISTS base.tareas ADD CONSTRAINT "es_inicial o es_final" CHECK (not (es_inicial and es_final));
ALTER TABLE IF EXISTS base.tareas ADD CONSTRAINT "es_inicial puede ser -si- o -vacio-" CHECK (es_inicial IS NULL OR es_inicial = TRUE);
ALTER TABLE IF EXISTS base.tareas ADD CONSTRAINT "es_final puede ser -si- o -vacio-" CHECK (es_final IS NULL OR es_final = TRUE);
ALTER TABLE IF EXISTS base.tareas ADD CONSTRAINT "es_inicial es unico por operativo " UNIQUE (operativo, es_inicial);
ALTER TABLE IF EXISTS base.tareas ADD CONSTRAINT "es_final es unico por operativo" UNIQUE (operativo, es_final);