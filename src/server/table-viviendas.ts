"use strict";
                
import {TableDefinition, TableContext} from "./types-dmencu";

export function viviendas(context:TableContext, opts:{extendida:boolean}):TableDefinition {
    var be=context.be;
    opts=opts||{};
    var puedeEditar = context.forDump || context.user.rol==='admin';
    var fieldsExtendidos=opts.extendida?[
         {name: "areaup"         , editable:false, typeName:'text'   , inTable:false}
        , {name: "id_marco"      , editable:false, typeName:'bigint' , inTable:false}
        , {name: "estrato_ing"   , editable:false, typeName:"integer", inTable:false}
        , {name: "tipo_domicilio", editable:false, typeName:"integer", inTable:false}
        , {name: "edad_sel_rango", editable:false, typeName:"integer", inTable:false}
        , {name: "cod_no_rea"    , editable:false, typeName:"text"   , inTable:false}
        , {name: "dominio"       , editable:false, typeName:"integer", inTable:false} 
        , {name: "zona"          , editable:false, typeName:"text"   , inTable:false}
        , {name: "fexp"          , editable:false, typeName:"integer", inTable:false}
        , {name: "clase"         , editable:false, typeName:"text"   , inTable:false}
        , {name: "panel"         , editable:false, typeName:"integer", inTable:false}
    ]:[];
    var def:TableDefinition= {
        "name": opts.extendida?'viviendas_extendida':"viviendas",
        title:  opts.extendida?'Viviendas extendidas':'Viviendas',
        editable: false,
        "fields": [
            {
                "name": "operativo",
                "typeName": "text",
                "visible": false,
                "nullable": false
            },
            {
                "name": "enc",
                "typeName": "text",
                "nullable": false
            },
            {name:'rea_m'        , typeName:'integer' , inTable: false},
            {name:'resultado'    , typeName:'text'    , inTable: false},
            {name:'etiqueta'     , typeName:'text'    , inTable: false},
            {name:'observaciones', typeName:'text'    , inTable: false},
            {name:'area'         , typeName:'integer' , inTable: false},
            {name:'nrocomuna'    , typeName:'integer' , inTable: false},
            {name:'nrofraccion'  , typeName:'integer' , inTable: false},
            {name:'nroradio'     , typeName:'integer' , inTable: false},
            ...fieldsExtendidos,
            {
                "name": "tipo_seleccion",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "g1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "g2",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "g3",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "g4",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "g5",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "ug2",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "ug3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "ug4",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "ug5",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "ug6",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "ug7",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "g9",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "dv1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "dv2",
                "typeName": "date",
                "nullable": true
            },
            {
                "name": "dv3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "dv3otros",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "dv4",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "dv5",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "tipo_relevamiento",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cp",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "p5",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "p6",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "sexo_sel",
                "typeName": "bigint",
                "nullable": true,
                inTable: false
            },
            {
                "name": "edad_sel",
                "typeName": "bigint",
                "nullable": true,
                inTable: false
            },
            {
                "name": "p9",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "p11",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "p12",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "sp1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "sp2",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "sp3",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "sp4",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "sp5",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "sp6",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "s1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "s2",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "s3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d2",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d4",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d5",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d6_1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d6_2",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d6_3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d6_4",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d6_5",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d6_6",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d6_7",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d6_8",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d6_9",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "d12",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "a1_1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "a1_2",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "a1_3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "a1_4",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "a1_5",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "a2",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "a3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "a4",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "a5",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv2_1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv2_2",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv2_3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv2_4",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv2_5",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv2_6",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv4_1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv4_2",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv4_3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv4_4",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv4_5",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "cv4_6",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "t1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "t2_1",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "t2_2",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "t2_3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "t2_4",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "t2_5",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "t2_6",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "t2_7",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "t2_8",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "t3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "e1",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "e2",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "e3",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "e4",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "e5",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "e6",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "e7",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "c1",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "c2",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "c3",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "c4",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "c5",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "c5ok",
                "typeName": "bigint",
                "nullable": true
            },
            {
                "name": "c6",
                "typeName": "text",
                "nullable": true
            },
            {
                "name": "observaciones_viv",
                "typeName": "text",
                "nullable": true,
                origen: 'fin'
            },
        ], //.map(x=>({...x, typeName:'text'})),
        "primaryKey": [
            "operativo",
            "enc"
        ],
        "detailTables": opts.extendida?[
            {
                "table": "personas_extendida",
                "fields": [
                    "operativo",
                    "enc"
                ],
                "abr": "p"
            }
        ]:[
            {
                "table": "personas",
                "fields": [
                    "operativo",
                    "enc"
                ],
                "abr": "p"
            }
        ],
        "foreignKeys": [
            {
                "references": "tem",
                "fields": [
                    "operativo",
                    "enc"
                ]
            }
        ]
    };    
    def.sql={
        isTable: !opts.extendida,
        isReferable:true,
        from:`
        (select *, 
            case when edad_sel >=18 and edad_sel<= 39 then 1
                 when edad_sel >=40 and edad_sel<= 59 then 2
                 when edad_sel >=60 and edad_sel<= 79 then 3
                 when edad_sel >=80  then 4
                 else null 
            end edad_sel_rango     
            from
            (select t.operativo, t.enc, t.area, t.nrocomuna, t.nrofraccion, t.nroradio
                , rea_m
                , resultado
                , etiqueta
                , observaciones
                , tipo_domicilio 
                , areaup
                , id_marco
                , estrato_ing  
                , case when tipos_inconsist is null then t.sexo_sel else null end::bigint sexo_sel 
                , case when tipos_inconsist is null then t.edad_sel else null end::bigint edad_sel 
                , ${be.sqlNoreaCase('no_rea')} as cod_no_rea
                , dominio
                , zona
                , fexp
                , clase
                , panel
                , "tipo_seleccion"
                , "g1"
                , "g2"
                , "g3"
                , "g4"
                , "g5"
                , "ug2"
                , "ug3"
                , "ug4"
                , "ug5"
                , "ug6"
                , "ug7"
                , "g9"
                , "dv1"
                , "dv2"
                , "dv3"
                , "dv3otros"
                , "dv4"
                , "dv5"
                , "tipo_relevamiento"
                , "cp"
                , "p5"
                , "p6"
                , "p9"
                , "p11"
                , "p12"
                , "sp1"
                , "sp2"
                , "sp3"
                , "sp4"
                , "sp5"
                , "sp6"
                , "s1"
                , "s2"
                , "s3"
                , "d1"
                , "d2"
                , "d3"
                , "d4"
                , coalesce("d5","d5c") as "d5"
                , "d6_1"
                , "d6_2"
                , "d6_3"
                , "d6_4"
                , "d6_5"
                , "d6_6"
                , "d6_7"
                , "d6_8"
                , "d6_9"
                , "d12"
                , "a1_1"
                , "a1_2"
                , "a1_3"
                , "a1_4"
                , "a1_5"
                , "a2"
                , "a3"
                , "a4" 
                , "a5"
                , "cv1"
                , "cv2_1"
                , "cv2_2"
                , "cv2_3"
                , "cv2_4"
                , "cv2_5"
                , "cv2_6"
                , "cv3"
                , "cv4_1"
                , "cv4_2"
                , "cv4_3"
                , "cv4_4"
                , "cv4_5"
                , "cv4_6"
                , "t1"
                , "t2_1"
                , "t2_2"
                , "t2_3"
                , "t2_4"
                , "t2_5"
                , "t2_6"
                , "t2_7"
                , "t2_8"
                , "t3"
                , "e1"
                , "e2"
                , "e3"
                , "e4"
                , "e5"
                , "e6"
                , "e7"
                , "c1"
                , "c2"
                , "c3"
                , "c4"
                , "c5"
                , "c5ok"
                , "c6"
                , "fin" as observaciones_viv
               -- ,x."personas"
              from tem t 
                left join etiquetas using(etiqueta) 
                    --, jsonb_populate_record(null::viv_fields_json , 
                    --    case when tipodato_inconsist is null then json_encuesta else null::jsonb end
                    , jsonb_to_record(case when tipos_inconsist is null then json_encuesta else null::jsonb end)
                        as viv(${ [...def.fields,{name:'d5c',typeName:'bigint'}].filter(fi=> fi.inTable==undefined ).map(fi=>(fi.origen?fi.origen:fi.name)+'    '+ fi.typeName).join() })
              where 
                ${opts.extendida?`dv1 is not null or resultado is not null`
                :`rea_m=1
                and resultado in ('Negativo','Positivo')`}
            )viv
        )    
        `, 
    };
    return def;
}

