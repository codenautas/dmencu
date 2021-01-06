"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function lotes(context:TableContext):TableDefinition {
    var admin = context.user.rol==='admin';
    return {
        name:'lotes',
        elementName:'lote',
        editable:admin,
        fields:[
            {name:'lote'            , typeName:'integer'   },
            {name:'barrios'         , typeName:'text'      , isName:true     },
            {name:'encuestas'       , typeName:'integer'   , isName:true     },
        ],
        primaryKey:['lote'],
        detailTables:[
            {table:'tem'          , fields:['lote'], abr:'E', label:'TEM'},
        ],
        sql:{
            from:`(
                select lote, 
                        string_agg(distinct barrio, ', ' order by barrio) as barrios, 
                        count(*) as encuestas 
                    from tem
                    where lote is not null
                    group by lote
                    order by lote
            )`,
            isTable:false
        }
    };
}

