// /lib/afip/utils/parseAfipError.ts

export function parseAfipError(response: any) {
    const errors = response.Errors?.Err;

    if (errors) {
        if (Array.isArray(errors)) {
            return errors.map((err) => `[${err.Code}] ${err.Msg}`).join(", ");
        }

        return `[${errors.Code}] ${errors.Msg}`;
    }

    const observations =
        response.FeDetResp?.FECAEDetResponse?.[0]?.Observaciones?.Obs;

    if (observations) {
        if (Array.isArray(observations)) {
            return observations
                .map((obs) => `[${obs.Code}] ${obs.Msg}`)
                .join(", ");
        }

        return `[${observations.Code}] ${observations.Msg}`;
    }

    return "Unknown AFIP error";
}
