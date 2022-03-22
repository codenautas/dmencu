set search_path = base;

UPDATE operativos
  SET config_sorteo= '{
        "F:RE":{
            "unidad_analisis": "personas",
            "unidad_analisis_padre": "hogares",
            "expr_incompletitud": {
                "3":{"dominio": 3, "expr": "not(nombre) or not(sexo) or not(edad)"},
                "5":{"dominio": 5, "expr": "not(nombre) or not(sexo) or not(edad) or (edad >= 18 and not(lp))"}
            },
            "disparador": "sorteo",
            "filtro": {
                "3":{"dominio": 3, "expr": "edad>=18"},
                "5":{"dominio": 5, "expr": "edad>=18 and lp = 1"}
            },
            "orden": [
                {"variable":"edad" , "orden":-1}
            ], 
            "parametros":["nombre","sexo","edad", "p4", "p5", "total_m","lp"],
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
            "resultado_manual":"cr_num_miembro_ing",
            "sorteado_mostrar": [{"source":"nombre", "target":"msnombre"}],
            "id_formulario_individual":"F:I1",
            "id_formulario_padre":"F:S1"
        },
        "F:RE_SUP":{
            "unidad_analisis": "personas_sup",
            "unidad_analisis_padre": "hogares_sup",
            "expr_incompletitud": {
                "3":{"dominio": 3, "expr": "not(nombre_sup) or not(sexo_sup) or not(edad_sup)"},
                "5":{"dominio": 5, "expr": "not(nombre_sup) or not(sexo_sup) or not(edad_sup)"}
            },
            "disparador": "sorteo_sup",
            "filtro": {
                "3":{"dominio": 3, "expr": "edad_sup>=18"},
                "5":{"dominio": 5, "expr": "edad_sup>=18"}
            },
            "orden": [
                {"variable":"edad_sup" , "orden":-1}
            ], 
            "parametros":["nombre_sup","sexo_sup","edad_sup", "sp4_sup", "spp5", "total_m_sup"],
            "incompletas":"_personas_incompletas_sup",
            "variableBotonFormularioUA":"$B.F:S1_P_SUP",
            "metodo": "tabla",
            "param_metodo": {
                "var_letra": "spl0_sup",
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
            "cantidad_sorteables":"total_rango_sup",
            "cantidad_total":"total_m_sup",
            "resultado": "nro_miembro_sel_sup",
            "resultado_manual":"nro_mie_sel_ing_sup",
            "sorteado_mostrar": [{"source":"nombre_sup", "target":"nombre_miembro_sel_sup"}]
        }
    }'
where operativo = 'PREJU_2022';

alter table tareas_tem
  add column if not exists rea integer,
  add column if not exists norea integer,
  add column if not exists resumen_estado text;
alter table "tareas_tem" add constraint "resumen_estado<>''" check ("resumen_estado"<>'');


alter table tareas add column if not exists registra_estado_en_tem boolean;

update tareas set registra_estado_en_tem = true where tarea in ('encu','recu');
