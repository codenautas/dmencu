"use strict";

import {TableDefinition, ContextForDump} from "./types-dmencu";
import {filtroTemSegunUsuario} from "./table-tem";

// Grilla auxiliar de la tem con los campos que se pueden editar a mano. Cada campo editable se persiste en tem
// (table:'tem'), porque la grilla de la tem no permite editar nada salvo habilitada.
// nromanzana, casa, nomcalle, nrocatastral, piso, departamento y habitacion sólo se pueden cambiar si el dominio es 5 (lo controla validar_domicilio_tem_trg).
export function tem_edicion(context:ContextForDump):TableDefinition {
    var puedeEditarCampo = !!(context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista');
    var puedeEditarProc = !!(context.forDump || context.puede?.encuestas?.procesar);
    var puedeEditarDomicilio = !!(context.forDump || context.puede?.campo?.administrar);
    return {
        name:'tem_edicion',
        elementName:'encuesta',
        title:'edición TEM',
        allow:{
            insert:false,
            delete:false,
            import:false,
        },
        editable: puedeEditarCampo||puedeEditarProc,
        fields:[
            {name:'operativo'            , typeName:'text'    , editable: false  , nullable: false},
            {name:'enc'                  , typeName:'text'    , editable: false  , nullable: false},
            {name:'area'                 , typeName:'integer' , editable: false  },
            {name:'zona'                 , typeName:'text'    , editable: false  },
            {name:'cita'                 , typeName:'text'    , editable: puedeEditarCampo||puedeEditarProc, table:'tem'},
            {name:'result_sup'           , typeName:'integer' , editable: puedeEditarCampo           , table:'tem'},
            {name:'fin_campo'            , typeName:'text'    , editable: puedeEditarCampo           , table:'tem'},
            {name:'proie'                , typeName:'text'    , editable: puedeEditarCampo||puedeEditarProc, table:'tem'},
            {name:'nomcalle'             , typeName:'text'    , editable: puedeEditarDomicilio       , table:'tem'},
            {name:'nrocatastral'         , typeName:'integer' , editable: puedeEditarDomicilio       , table:'tem'},
            {name:'piso'                 , typeName:'text'    , editable: puedeEditarDomicilio       , table:'tem'},
            {name:'departamento'         , typeName:'text'    , editable: puedeEditarDomicilio       , table:'tem'},
            {name:'habitacion'           , typeName:'text'    , editable: puedeEditarDomicilio       , table:'tem'},
            {name:'dominio'              , typeName:'integer' , editable: false  },
            {name:'nrocomuna'            , typeName:'text'    , editable: false  },
            {name:'nrofraccion'          , typeName:'integer' , editable: false  },
            {name:'nroradio'             , typeName:'integer' , editable: false  },
            {name:'nromanzana'           , typeName:'integer' , editable: puedeEditarDomicilio       , table:'tem'},
            {name:'casa'                 , typeName:'text'    , editable: puedeEditarDomicilio       , table:'tem'},
        ],
        primaryKey:['operativo','enc'],
        sql:{
            isTable:false,
            from:`
                (select t.operativo, t.enc, t.area, t.zona, t.cita, t.result_sup, t.fin_campo, t.proie
                        , t.nomcalle, t.nrocatastral, t.piso, t.departamento, t.habitacion
                        , t.dominio, t.nrocomuna, t.nrofraccion, t.nroradio, t.nromanzana, t.casa
                    from tem t
                            ${filtroTemSegunUsuario(context)}
                )
            `
        }
    };
}
