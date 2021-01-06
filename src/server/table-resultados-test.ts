"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function resultados_test(context:TableContext, opts:null|{all:boolean, name:string}):TableDefinition {
    var be=context.be;
    var admin = context.user.rol==='admin';
    var puedeAvisar = context.forDump || context.puede.lab_resultado.avisar && !admin;
    return {
        name: 'resultados_test',
        elementName:'resultado_test',
        allow:{
            insert:false,
            delete:false,
            update:puedeAvisar,
        },     
        fields:[
            { name:'resultado'         , typeName:'text'    , editable:false , nullable:false },
            { name:'email_asunto'      , typeName:'text'    , editable: true                  },
            { name:'email_texto'       , typeName:'text'    , editable: true                  },
            { name:'pagina_texto'      , typeName:'text'    , editable: true                  },
        ],
        primaryKey:['resultado'],
    };
}

