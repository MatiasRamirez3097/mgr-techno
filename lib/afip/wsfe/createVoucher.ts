import { soapRequest } from "../client";

interface Params {
    token: string;

    sign: string;

    cuit: string;

    feCAEReq: any;
}
const WSFE_URL = "https://servicios1.afip.gov.ar/wsfev1/service.asmx";

export async function createVoucher({ token, sign, cuit, feCAEReq }: Params) {
    const {
        Concepto,
        DocTipo,
        DocNro,
        CbteDesde,
        CbteHasta,
        CbteFch,
        ImpTotal,
        ImpTotConc,
        ImpNeto,
        ImpOpEx,
        ImpIVA,
        ImpTrib,
        MonId,
        MonCotiz,
    } = feCAEReq.FeCAEReq.FeDetReq.FECAEDetRequest[0];

    const { CbteTipo } = feCAEReq.FeCabReq;

    const ivaXml =
        feCAEReq.FeCAEReq.FeDetReq.FECAEDetRequest[0].Iva.AlicIva.map(
            (iva: any) => `
            <AlicIva>
                <Id>${iva.Id}</Id>
                <BaseImp>${iva.BaseImp}</BaseImp>
                <Importe>${iva.Importe}</Importe>
            </AlicIva>
        `,
        ).join("");

    const response = await soapRequest({
        useLegacySSL: true,
        url: WSFE_URL,
        operation: "FECAESolicitar",
        xmlns: "http://ar.gov.afip.dif.FEV1/",
        body: {
            auth: {
                token,
                sign,
                cuit,
            },
            payload: `<FeCAEReq>
            <FeCabReq>
               <CantReg>1</CantReg>
               <PtoVta>5</PtoVta>
               <CbteTipo>${CbteTipo}</CbteTipo>
            </FeCabReq>
            <FeDetReq>
               <FECAEDetRequest>
                  <Concepto>${Concepto}</Concepto>
                  <DocTipo>${DocTipo}</DocTipo>
                  <DocNro>${DocNro}</DocNro>
                  <CbteDesde>${CbteDesde}</CbteDesde>
                  <CbteHasta>${CbteHasta}</CbteHasta>
                  <CbteFch>${CbteFch}</CbteFch>
                  <ImpTotal>${ImpTotal}</ImpTotal>
                  <ImpTotConc>${ImpTotConc}</ImpTotConc>
                  <ImpNeto>${ImpNeto}</ImpNeto>
                  <ImpOpEx>${ImpOpEx}</ImpOpEx>
                  <ImpIVA>${ImpIVA}</ImpIVA>
                  <ImpTrib>${ImpTrib}</ImpTrib>
                  <MonId>${MonId}</MonId>
                  <MonCotiz>${MonCotiz}</MonCotiz>
                  <Iva>
                     ${ivaXml}
                  </Iva>
               </FECAEDetRequest>
            </FeDetReq>
         </FeCAEReq>`,
        },
    });
    return {
        xml: response.xml,
        json: response.json.Envelope.Body.FECAESolicitarResponse
            .FECAESolicitarResult,
    };
}
