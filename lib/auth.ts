import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import { CustomerModel } from "@/models/Customer";

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function getCustomerByEmail(email: string) {
    await connectDB();
    return CustomerModel.findOne({ email }).lean();
}

export async function getCustomerById(id: string) {
    await connectDB();
    return CustomerModel.findById(id).lean();
}
