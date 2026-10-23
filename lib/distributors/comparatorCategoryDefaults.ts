import type { ComparatorCategoryInput } from "@/lib/validators/comparatorCategorySchema";

// Mapeo con el que se inicializa la colección la primera vez (antes estaba hardcodeado
// en CATEGORY_MAP y CategorySelect). Después se edita desde /admin/comparator/categories.
export const DEFAULT_COMPARATOR_CATEGORIES: ComparatorCategoryInput[] = [
    {
        key: "ACCESORIOS",
        name: "Accesorios",
        order: 10,
        active: true,
        elit: [{ paramType: "categoria", value: "ACCESORIOS" }],
        newbytes: ["ACCESORIOS"],
        invid: ["Accesorios"],
    },
    {
        key: "CONECTIVIDAD",
        name: "Conectividad",
        order: 20,
        active: true,
        elit: [{ paramType: "categoria", value: "CONECTIVIDAD" }],
        newbytes: ["CONECTIVIDAD"],
        invid: ["Conectividad"],
    },
    {
        key: "SSD-INTERNOS",
        name: "SSD Internos",
        order: 30,
        active: true,
        elit: [{ paramType: "sub_categoria", value: "Discos Internos SSD" }],
        newbytes: ["DISCOS-SSD"],
        invid: ["SSD"],
    },
    {
        key: "GABINETES",
        name: "Gabinetes",
        order: 40,
        active: true,
        elit: [{ paramType: "categoria", value: "GABINETES" }],
        newbytes: ["GABINETES"],
        invid: ["Gabinetes"],
    },
    {
        key: "MEMORIAS",
        name: "Memorias",
        order: 50,
        active: true,
        elit: [{ paramType: "categoria", value: "Memorias" }],
        newbytes: ["Memorias"],
        invid: ["Memorias"],
    },
    {
        key: "MOTHERBOARDS",
        name: "Motherboards",
        order: 60,
        active: true,
        elit: [{ paramType: "sub_categoria", value: "Motherboards" }],
        newbytes: ["MOTHER-ASUS", "MOTHER-ASROCK", "MOTHER-GIGABYTE"],
        invid: ["Mother", "Placas Madre"],
    },
    {
        key: "PROCESADORES",
        name: "Procesadores",
        order: 70,
        active: true,
        elit: [{ paramType: "sub_categoria", value: "Procesadores" }],
        newbytes: ["PROCESADORES"],
        invid: ["Procesadores"],
    },
    {
        key: "VIDEO",
        name: "Placas de Video",
        order: 80,
        active: true,
        elit: [{ paramType: "sub_categoria", value: "Placas de Video" }],
        newbytes: ["PLACA-DE-VIDEO"],
        invid: ["120", "172", "Placas de Video"],
    },
    {
        key: "CASA-INTELIGENTE",
        name: "Casa Inteligente",
        order: 90,
        active: true,
        elit: [{ paramType: "categoria", value: "SMART HOME" }],
        newbytes: ["CASA-INTELIGENTE"],
        invid: ["Smart Home", "Casa Inteligente", "Domotica"],
    },
];

// NewBytes pide guiones en lugar de espacios en los nombres de categoría
// (así funcionan los valores históricos, ej. "PLACA-DE-VIDEO")
export const toNewBytesCategoryParam = (description: string) =>
    description.trim().replace(/\s+/g, "-");
