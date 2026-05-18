import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { NextRequest } from "next/server";
import { startSession } from "mongoose";

import { sendPaymentConfirmedEmail } from "@/lib/email";
import { reverseInventoryAllocation } from "@/lib/inventory/reverseInventoryAllocation";

export async function POST(req: NextRequest) {
    const body = await req.json();
    console.log(body);
}
