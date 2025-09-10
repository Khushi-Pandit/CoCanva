"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { Poppins, Roboto } from "next/font/google";
import { Eye, EyeOff } from "lucide-react"; // 👈 install: npm i lucide-react

// Google Fonts
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500"] });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const SignUp = () => {
    router.push("/signup");
  };
  const handleLogin = () => {
    router.push("/Main");
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-emerald-100 pt-9 pb-9 pl-22 pr-22">
      <div className="bg-white rounded-2xl shadow-lg w-330 h-143 flex">
        {/* Left side image */}
        <div className="w-full md:w-1/2 bg-emerald-200 flex flex-col items-center justify-center p-6">
          <Image
            src="/images/login.png"
            alt="Login Illustration"
            width={400}
            height={400}
            className="object-contain"
          />
          <p
            className={`${roboto.className} text-center text-gray-700 mt-4 text-xl px-4`}
          >
            Turn your ideas into reality with Canvasly!
          </p>
          <p
            className={`${roboto.className} text-center text-gray-600 mt-2 text-sm px-4`}
          >
            Brainstorm. Plan. Achieve. Your creativity starts here.
          </p>
        </div>

        {/* Right side form */}
        <div className="w-1/2 pt-13 pl-25 pr-25 pb-20">
          <h1 className="flex items-center justify-center text-[30px] pb-10 text-black">
            Canvasly
          </h1>

          <p className="text-[14px] text-gray-500">Username or Email</p>
          <input
            type="text"
            className="w-full mt-1 mb-4 p-2 border border-gray-300 rounded text-black focus:outline-none focus:ring-1 focus:ring-gray-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <p className="text-[14px] text-gray-500">Password</p>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full mt-1 mb-1 p-2 border border-gray-300 rounded text-black focus:outline-none focus:ring-1 focus:ring-gray-400 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {password.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </div>

          {error && <p className="text-red-500 text-sm mt-2 mb-2">{error}</p>}

          <p className="text-[13px] text-green-500 flex justify-end underline">
            Forgot Password?
          </p>

          <div className="pb-5">
            <button
              className="w-full bg-black text-white py-2 rounded mt-4"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="text-gray-500 text-sm">OR</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>

          <div className="flex items-center justify-center mt-4">
            <button className="flex items-center gap-2 text-[13px] text-black px-4 py-2 rounded border border-gray-300 bg-white hover:bg-gray-100 transition">
              <Image
                src="/images/googleIcon.png"
                alt="Google Icon"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              Sign in with Google
            </button>
          </div>

          <div className="flex justify-center gap-1 text-[13px] text-black mt-4">
            <p>Are you new?</p>
            <p className="text-green-500 underline cursor-pointer">
              <span onClick={SignUp} className="cursor-pointer">
                Create an Account
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
