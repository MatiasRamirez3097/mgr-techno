type PadronData = any; // después lo tipamos mejor

export function mapPadronToSupplier(data: PadronData) {
    console.log(data.datosGenerales);
    return {
        name: data.datosGenerales?.razonSocial
            ? data.datosGenerales.razonSocial
            : `${data.datosGenerales.apellido || ""} ${data.datosGenerales.nombre || ""}`.trim(),

        //taxId: String(data.idPersona || ""),

        //email: "", // AFIP no lo da
        //phone: "",

        //website: "",

        address: {
            street: data.datosGenerales?.domicilioFiscal?.direccion || "",
            city: data.datosGenerales?.domicilioFiscal?.localidad || "",
            state:
                data.datosGenerales?.domicilioFiscal?.descripcionProvincia ||
                "",
            zip: data.datosGenerales?.domicilioFiscal?.codPostal || "",
            country: "AR",
        },

        //contactName: isCompany
        //    ? ""
        //    : `${data.nombre || ""} ${data.apellido || ""}`.trim(),

        //notes: `Estado AFIP: ${data.estadoClave || "N/D"}`,

        //isActive: data.estadoClave === "ACTIVO",
    };
}
