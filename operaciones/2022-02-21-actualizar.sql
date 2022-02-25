set search_path = base;

set role dmencu_owner;

alter table parametros drop column mail_aviso_texto;
alter table parametros drop column mail_aviso_asunto;
alter table parametros add column operativo;
alter table "parametros" add constraint "operativo<>''" check ("operativo"<>'');
alter table "parametros" alter column "operativo" set not null;
alter table "parametros" add constraint "parametros operativos REL" foreign key ("operativo") references "operativos" ("operativo")  on update cascade;
create index "operativo 4 parametros IDX" ON "parametros" ("operativo");

insert into parametros (operativo) values ('etoi211');

ALTER TABLE operativos
  ADD column config_sorteo jsonb default null;
UPDATE operativos
  SET config_sorteo= '{
        "unidad_analisis": "personas",
		"expr_incompletitud": {
			"3":{"dominio": 3, "expr": "not(nombre) or not(sexo) or not(edad)"},
			"5":{"dominio": 5, "expr": "not(nombre) or not(sexo) or not(edad)"}
		},
        "disparador": "sorteo",
        "filtro": {
			"3":{"dominio": 3, "expr": "edad>=18"},
			"5":{"dominio": 5, "expr": "edad>=18"}
		},
        "orden": [
            {"variable":"edad" , "orden":-1}
        ], 
        "parametros":["nombre","sexo","edad", "p4", "p5", "total_m"],
		"incompletas":"_personas_incompletas",
		"variableBotonFormularioUA":"$B.F:S1_P",
        "metodo": "tabla",
        "param_metodo": {
			"var_letra": "l0",
            "tabla": [
                "AAAAAAAAAA",
                "BABAABAABB",
                "ACCBBABBAC",
                "BAACCBDCDA",
                "CBEDAEADCB",
                "FDBAECEAFD",
                "ECDGGFCBBA",
                "DGAECDBFHC",
                "GEHCBIHDAF",
                "AHFBDJGCIE",
                "IAGHFEDBIK",
                "GDDJAAFECL",
                "ACHMEKHJBM",
                "JMCHIAENLC",
                "OGCKMIKMJN"
            ]
        },
		"cantidad_sorteables":"tp",
		"cantidad_total":"total_m",
        "resultado": "cr_num_miembro",
		"id_formulario_individual":"F:I1"
    }'