type PadronData = any; // después lo tipamos mejor

export function mapPadronToSupplier(data: PadronData) {
    console.log(data);
    const taxConditon = () => {
        if (data.datosRegimenGeneral) {
            for (const imp of data.datosRegimenGeneral.impuesto) {
                if (imp.descriptionImpuesto == "IVA")
                    return "RESPONSABLE INSCRIPTO";
                else if (imp.descripcionImpuesto == "IVA NO ALCANZADO")
                    return "IVA NO ALCANZADO";
            }
        } else if (data.datosMonotributo) {
            for (const imp of data.datosMonotributo.inmpuesto) {
                if (imp.descriptionImpuesto == "MONOTRIBUTO")
                    return "MONOTRIBUTO";
            }
        }
        return "CONSUMIDOR FINAL";
    };
    const name = () => {
        if (data.datosGenerales) {
            return data.datosGenerales?.razonSocial
                ? data.datosGenerales.razonSocial
                : `${data.datosGenerales.apellido || ""} ${data.datosGenerales.nombre || ""}`.trim();
        } else return data.errorConstancia.apellido;
    };
    console.log("name>>>", name());
    return {
        name: name(),
        taxCondition: taxConditon(),
        address: data.datosGenerales
            ? {
                  street: data.datosGenerales?.domicilioFiscal?.direccion || "",
                  city: data.datosGenerales?.domicilioFiscal?.localidad || "",
                  state:
                      data.datosGenerales?.domicilioFiscal
                          ?.descripcionProvincia || "",
                  zip: data.datosGenerales?.domicilioFiscal?.codPostal || "",
                  country: "AR",
              }
            : undefined,
    };
}
