"use strict";

import { AppBackend, emergeAppMetaEnc, emergeAppOperativos, emergeAppRelEnc } from "meta-enc";
import { emergeAppConsistencias, emergeAppDatosExt, emergeAppProcesamiento, emergeAppVarCal, OperativoGenerator , pgWhiteList } from "procesamiento";
import { emergeAppDmEncu } from "./app-dmencu";

OperativoGenerator.mainTD = 'viviendas';
OperativoGenerator.mainTDPK = 'vivienda'; // TODO: hacer esto dinámico en paquete consistencias

pgWhiteList.push('blanco');

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
);

new AppDmEncu().start();

