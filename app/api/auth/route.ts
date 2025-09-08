import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

// POST login
export async function POST(req: Request) {
  await connectDB();
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // ✅ Instead of JWT, just return user details
  return NextResponse.json({
    message: "Login successful",
    user: { id: user._id, name: user.name, email: user.email },
  });
}

//kindly add for the backend
// import { NextResponse } from "next/server";

// // POST login with default values
// export async function POST(req: Request) {
//   const { email, password } = await req.json();

//   if (email === "khushi" && password === "khushi") {
//     return NextResponse.json({
//       message: "Login successful",
//       user: { name: "Khushi", email: "khushi" },
//     });
//   }

//   return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
// }
