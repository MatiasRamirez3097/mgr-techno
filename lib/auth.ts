import bcrypt from "bcryptjs";
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
