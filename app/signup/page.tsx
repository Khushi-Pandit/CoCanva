"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Poppins, Roboto } from "next/font/google";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react"; // 👈 install: npm i lucide-react

// Google Fonts
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500"] });

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const goToLogin = () => {
    router.push("/login");
  };

  const MainScreen = () => {
    router.push("/main");
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-emerald-100 pt-9 pb-9 pl-22 pr-22">
      <div className="bg-white rounded-2xl shadow-lg w-330 h-143 flex">
        {/* Left side image */}
        <div className="w-full md:w-1/2 bg-emerald-200 flex flex-col items-center justify-center p-6 rounded-l-2xl">
          <Image
            src="/images/login.png"
            alt="Login Illustration"
            width={400}
            height={400}
            className="object-contain"
          />
        </div>

        {/* Right side form */}
        <div className="w-1/2 pt-13 pl-25 pr-25 pb-7">
          <h1 className="flex items-center justify-center text-[30px] pb-5 text-black">
            Create Your Account
          </h1>

          {/* Full Name */}
          <p className="text-[14px] text-gray-500">Full Name</p>
          <input
            type="text"
            className="w-full mt-1 mb-3 p-2 border border-gray-300 rounded text-black focus:outline-none focus:ring-1 focus:ring-gray-400"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          {/* Email */}
          <p className="text-[14px] text-gray-500">Email</p>
          <input
            type="email"
            className="w-full mt-1 mb-3 p-2 border border-gray-300 rounded text-black focus:outline-none focus:ring-1 focus:ring-gray-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* Password */}
          <p className="text-[14px] text-gray-500">Password</p>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full mt-1 mb-3 p-2 border border-gray-300 rounded text-black focus:outline-none focus:ring-1 focus:ring-gray-400 pr-10"
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

          {/* Confirm Password */}
          <p className="text-[14px] text-gray-500">Confirm Password</p>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="w-full mt-1 p-2 border border-gray-300 rounded text-black focus:outline-none focus:ring-1 focus:ring-gray-400 pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword.length > 0 && (
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </div>

          {/* Sign Up Button */}
          <div className="pb-4">
            <button
              className="w-full bg-black text-white py-2 rounded mt-4"
              onClick={MainScreen}
            >
              Sign Up
            </button>
          </div>

          {/* Divider */}
          {/* <div className="flex items-center gap-4">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="text-gray-500 text-sm">OR</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div> */}

          {/* Google Sign In */}
          {/* <div className="flex items-center justify-center mt-4">
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
          </div> */}

          {/* Already have account */}
          <div className="flex justify-center gap-1 text-[13px] text-black mt-2">
            <p>Already have an account?</p>
            <p className="text-green-500 underline cursor-pointer">
              <span onClick={goToLogin} className="cursor-pointer">
                Log In
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
