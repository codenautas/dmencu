"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function semanas(context:TableContext):TableDefinition {
    var admin = context.user.rol==='admin';
    return {
        name:'semanas',
        elementName:'semana',
        editable:admin,
        fields:[
            {name:'semana'          , typeName:'integer'   },
            {name:'encuestas'       , typeName:'integer'   , isName:true     },
        ],
        primaryKey:['semana'],
        detailTables:[
            {table:'tem'          , fields:['semana'], abr:'E', label:'TEM'},
        ],
        sql:{
            from:`(
                select semana, 
                        count(*) as encuestas 
                    from tem
                    where semana is not null
                    group by semana
                    order by semana
            )`,
            isTable:false
        }
    };
}

