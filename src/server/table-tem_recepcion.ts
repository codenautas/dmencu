"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import {casos} from "./table-casos";

export function tem_recepcion(context:TableContext):TableDefinition {
    return casos(context, {recepcion:true});
}
