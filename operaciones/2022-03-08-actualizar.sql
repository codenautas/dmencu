set search_path = base;

set role dmencu_owner;

UPDATE operativos
  SET config_sorteo= '{
        "F:RE":{
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
            "variableBotonFormularioUAIndividual":"$B.F:I1",
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
            "sorteado_mostrar": [{"source":"nombre", "target":"msnombre"}],
            "id_formulario_individual":"F:I1"
        }
    }'
where operativo = 'PREJU_2022';