/* eslint-disable @typescript-eslint/no-explicit-any */
import { User } from '@/models';
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const {fullName, email, password, confirmPassword} : {fullName: string | null; email : string | null; password: string | null; confirmPassword : string | null} = await req.json();
        if(!email || ! password || !fullName || !confirmPassword){
            return NextResponse.json({ error: "Input fields missing" }, { status: 400 });
        }
        const user = await User.findOne({email});
        if(user){
            return NextResponse.json({ error: "User Already Exists" }, { status: 409 });
        }
        if(password !== confirmPassword){
            return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            fullName,
            email,
            password: hashedPassword,
        });
        await newUser.save();
        return NextResponse.json({ message: "User Registered Successfully" }, { status: 201 });
    } catch (error: any){
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}