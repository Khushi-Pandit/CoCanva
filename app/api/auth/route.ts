import { NextResponse } from "next/server";

// POST login with default values
export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (email === "khushi" && password === "khushi") {
    return NextResponse.json({
      message: "Login successful",
      user: { name: "Khushi", email: "khushi" },
    });
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
