// /lib/afip/wsfe/createVoucher.ts

import { soapRequest } from "../client";

interface Params {
    token: string;

    sign: string;

    cuit: number;

    payload: any;
}

export async function createVoucher({ token, sign, cuit, payload }: Params) {
    const response = await soapRequest({
        operation: "FECAESolicitar",

        body: {
            Auth: {
                Token: token,
                Sign: sign,
                Cuit: cuit,
            },

            FeCAEReq: payload.FeCAEReq,
        },
    });

    return response.FECAESolicitarResult;
}
