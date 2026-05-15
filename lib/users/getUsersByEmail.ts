import { UserModel } from "@/models/User";
import { connectDB } from "../mongodb";
import { Types } from "mongoose";

export async function getUsersIdByEmail(email: string) {
    console.log(">>>email:", email);
    await connectDB();
    const user = await UserModel.findOne({ email }).lean();

    return user;
}
