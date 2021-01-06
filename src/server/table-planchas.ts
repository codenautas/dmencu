"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function planchas(context:TableContext):TableDefinition {
    var admin = context.user.rol==='admin';
    var esCoor = context.forDump || context.puede.campo.administrar;
    return {
        name:'planchas',
        elementName:'plancha',
        editable:esCoor,
        fields:[
            {name:'plancha'          , typeName:'text'      , nullable:false  },
            {name:'impresa'          , typeName:'date'      },
            {name:'relevador'        , typeName:'text'      },
            {name:'observaciones'    , typeName:'text'      },
        ],
        primaryKey:['plancha'],
        foreignKeys:[
            {references:'usuarios', fields:[{source:'relevador', target:'idper'}]}
        ],
        detailTables:[
            {table:'etiquetas'     , fields:['plancha'], abr:'E'},
        ],
    };
}

