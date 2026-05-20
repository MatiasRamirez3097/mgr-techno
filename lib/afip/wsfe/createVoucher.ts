import { soapRequest } from "../client";

interface Params {
    token: string;

    sign: string;

    cuit: string;

    feCAEReq: any;
}

export async function createVoucher({ token, sign, cuit, feCAEReq }: Params) {
    const response = await soapRequest({
        operation: "FECAESolicitar",

        body: {
            Auth: {
                Token: token,

                Sign: sign,

                Cuit: cuit,
            },

            FeCAEReq: feCAEReq,
        },
    });

    return response.FECAESolicitarResult;
}
