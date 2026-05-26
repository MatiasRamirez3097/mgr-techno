import QRCode from "qrcode";

import { generateAfipQr } from "@/lib/afip/qr/generateAfipQr";

export async function orderDocumentTemplate(data: any) {
    let qrImage = "";

    if (data.document.isFiscal) {
        const qrUrl = generateAfipQr({
            cuit: Number(process.env.AFIP_CUIT),

            pointOfSale: data.afip.pointOfSale,

            voucherType: data.afip.voucherType,

            voucherNumber: data.afip.voucherNumber,

            total: data.totals.total,

            documentType: 96,

            documentNumber: Number(data.customer.document),

            cae: data.afip.cae,

            date: new Date().toISOString().split("T")[0],
        });

        qrImage = await QRCode.toDataURL(qrUrl);
    }

    return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />

<style>
body{
    font-family: Arial, sans-serif;
    padding:40px;
    color:#111;
}

.header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    margin-bottom:30px;
}

.business h1{
    margin:0;
    font-size:28px;
}

.afip-box{
    border:1px solid #000;
    width:80px;
    height:80px;
    text-align:center;
}

.afip-letter{
    font-size:42px;
    font-weight:bold;
}

.section{
    margin-bottom:30px;
}

table{
    width:100%;
    border-collapse:collapse;
}

th, td{
    border-bottom:1px solid #ddd;
    padding:10px;
    text-align:left;
}

.totals{
    margin-top:30px;
    width:300px;
    margin-left:auto;
}

.total-row{
    display:flex;
    justify-content:space-between;
    margin-bottom:10px;
}

.final-total{
    font-size:22px;
    font-weight:bold;
}

.footer{
    margin-top:50px;
    display:flex;
    align-items:flex-start;
    gap:30px;
}

.qr img{
    width:110px;
}
</style>
</head>

<body>

<div class="header">

<div class="business">
<h1>${data.business.name}</h1>

<p>${data.business.address}</p>

<p>${data.business.phone}</p>

<p>${data.business.email}</p>
</div>

<div>

${
    data.document.isFiscal
        ? `
<div class="afip-box">
<div class="afip-letter">
${data.document.letter}
</div>

<div>COD. 006</div>
</div>
`
        : ""
}

<h2>${data.document.type}</h2>

<p>
N°
${data.document.number}
</p>

<p>
${data.document.date}
</p>

</div>

</div>

<div class="section">

<h3>Cliente</h3>

<p>${data.customer.name}</p>

${data.customer.email ? `<p>${data.customer.email}</p>` : ""}

${data.customer.phone ? `<p>${data.customer.phone}</p>` : ""}

${data.customer.address ? `<p>${data.customer.address}</p>` : ""}

${
    data.document.isFiscal
        ? `
<p>
Documento:
${data.customer.document || "-"}
</p>

<p>
Condición IVA:
${data.customer.taxCondition?.label || "-"}
</p>
`
        : ""
}

</div>

<table>
<thead>
<tr>
<th>Producto</th>
<th>Cant.</th>
<th>Precio</th>
<th>Total</th>
</tr>
</thead>

<tbody>

${data.items
    .map(
        (item: any) => `
<tr>
<td>${item.name}</td>

<td>${item.quantity}</td>

<td>
$ ${item.price.toFixed(2)}
</td>

<td>
$ ${item.total.toFixed(2)}
</td>
</tr>
`,
    )
    .join("")}

</tbody>
</table>

<div class="totals">

<div class="total-row">
<span>Subtotal</span>

<span>
$ ${data.totals.subtotal.toFixed(2)}
</span>
</div>

<div class="total-row">
<span>Envío</span>

<span>
$ ${data.totals.shipping.toFixed(2)}
</span>
</div>

<div class="total-row final-total">
<span>TOTAL</span>

<span>
$ ${data.totals.total.toFixed(2)}
</span>
</div>

</div>

<div class="footer">

${
    data.document.isFiscal
        ? `
<div class="qr">
<img src="${qrImage}" />
</div>

<div>
<p>
CAE:
${data.afip.cae}
</p>

<p>
Vto. CAE:
${data.afip.caeExpiration}
</p>

<p>
Comprobante autorizado por AFIP
</p>
</div>
`
        : `
<p>
Comprobante no fiscal
</p>
`
}

</div>

</body>
</html>
`;
}
