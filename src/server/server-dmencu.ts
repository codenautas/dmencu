"use strict";

import { AppBackend, emergeAppMetaEnc, emergeAppOperativos, emergeAppRelEnc } from "meta-enc";
import { emergeAppConsistencias, emergeAppDatosExt, emergeAppProcesamiento, emergeAppVarCal, OperativoGenerator /*, pgWitheList */} from "procesamiento";
import { emergeAppDmEncu } from "./app-dmencu";

OperativoGenerator.mainTD = 'viviendas';
OperativoGenerator.mainTDPK = 'vivienda'; // TODO: hacer esto dinámico en paquete consistencias
OperativoGenerator.orderedIngresoTDNames = [OperativoGenerator.mainTD, 'vivienda_calculada'];
OperativoGenerator.orderedReferencialesTDNames = ['lotes'];

//pgWitheList.push('abs');

var AppDmEncu = emergeAppDmEncu(
    emergeAppProcesamiento(
        emergeAppConsistencias(
            emergeAppDatosExt(
                emergeAppMetaEnc(
                    emergeAppRelEnc(
                        emergeAppVarCal(
                            emergeAppOperativos(AppBackend)
                        )
                    )
                )
            )
        )
    )
);

new AppDmEncu().start();

