"use strict";

import {TableDefinition, ContextForDump, TableContext} from "./types-dmencu";

export function tem_borradas(context:TableContext):TableDefinition {
    return {
        name:`tem_borradas`,
        editable: context.forDump,
        fields:[
            {name:'operativo'                 , typeName:'text'      , editable: false  , nullable: false },
            {name:'enc'                       , typeName:'text'      , editable: false  , nullable: false },
            {name:'cuando'                    , typeName:'timestamp' , editable: false  , nullable: false },
            {name:'area'                      , typeName:'integer'   , editable: false  },
            {name:'cluster'                   , typeName:'integer'   , editable: false  },
            {name:'dominio'                   , typeName:'integer'   , editable: false  },
            {name:'tarea_actual'              , typeName:'text'      , editable: false  },
            {name:'json_encuesta'             , typeName:'jsonb'     , editable: false  },
            {name:"token_autogenerado_dm"     , typeName:'text'      , editable: false  },
            {name:"enc_autogenerado_dm"       , typeName:'text'      , editable: false  },
            {name:"enc_autogenerado_dm_capa"  , typeName:'text'      , editable: false  },
            {name:'proie'                     , typeName:'text'      , editable: false  },
        ],
        primaryKey: ["operativo", "enc", "cuando"],
    }
}