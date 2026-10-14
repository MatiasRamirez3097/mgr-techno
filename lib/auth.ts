import bcrypt from "bcryptjs";
import crypto from "crypto";
import { connectDB } from "./mongodb";
import { UserModel } from "@/models/User";

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function getUserByEmail(email: string) {
    await connectDB();
    return UserModel.findOne({ email }).lean();
}

export async function getUserById(id: string) {
    await connectDB();
    return UserModel.findById(id).lean();
}

export function generateVoucherToken(voucherId: string): string {
    const secret = process.env.NEXTAUTH_SECRET || "mgr_voucher_secret";
    return crypto.createHmac("sha256", secret).update(voucherId).digest("hex").slice(0, 32);
}
