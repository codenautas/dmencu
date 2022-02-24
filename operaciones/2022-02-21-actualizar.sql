set search_path = base;

set role dmencu_owner;
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
        "resultado": "cr_num_miembro"
    }'