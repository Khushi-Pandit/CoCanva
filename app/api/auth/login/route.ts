/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "@/models";
import { NextRequest, NextResponse } from "next/server";

export async function POST (req: NextRequest) {
    try {
        const {email, password} : {email: string | null ; password: string | null}= await req.json();
        if(!email || !password) {
            return NextResponse.json({ error: "Input fields missing" }, { status: 400 });
        }
        const user = await User.findOne({email});
        if(!user) {
            return NextResponse.json({ error: "User Not Found" }, { status: 401 });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if(!isPasswordCorrect) {
            return NextResponse.json({ error: "Invalid Credentials" }, { status: 401 });
        }
        const secret = process.env.JWT_SECRET_KEY;
        if (!secret) {
            throw new Error("JWT_SECRET_KEY is not defined in .env.local");
        }
        const token = jwt.sign(
            {
                id : user._id,
            },
            secret,
            { expiresIn: "1d" }
        );
        const { password: _, ...userWithoutPassword } = user.toObject();
        return NextResponse.json({
            message: "Login Successful",
            token,
            user: userWithoutPassword,
        });
    }catch (error: any) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}