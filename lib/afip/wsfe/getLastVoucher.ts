import { soapRequest } from "../client";

interface Params {
    token: string;

    sign: string;

    cuit: string;

    pointOfSale: number;

    voucherType: number;
}

export async function getLastVoucher({
    token,
    sign,
    cuit,
    pointOfSale,
    voucherType,
}: Params) {
    const response = await soapRequest({
        operation: "FECompUltimoAutorizado",

        body: {
            Auth: {
                Token: token,

                Sign: sign,

                Cuit: cuit,
            },

            PtoVta: pointOfSale,

            CbteTipo: voucherType,
        },
    });

    return Number(response.FECompUltimoAutorizadoResult.CbteNro);
}
