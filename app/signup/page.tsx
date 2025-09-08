"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SignUpPage() {
  const router = useRouter();

  const goToLogin = () => {
    router.push("/login");
  };

  const MainScreen = () => {
    router.push("/main");
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-emerald-100 pt-9 pb-9 pl-22 pr-22">
      <div className="bg-white rounded-2xl shadow-lg w-330 h-143 flex">
        <div className="w-1/2 bg-emerald-200 rounded-l-2xl overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <img
              src="/images/signup.gif"
              alt="Sign Up Image"
              className="w-full h-full object-cover text-white"
            />
          </div>
        </div>

        <div className="w-1/2 pt-5 pl-25 pr-25 pb-7">
          <h1 className="flex items-center justify-center text-[30px] pb-5 text-black">
            Create Your Account
          </h1>
          <p className="text-[14px] text-gray-500">Full Name</p>
          <input
            type="text"
            className="w-full mb-3 p-2 border border-gray-300 rounded"
          />
          <p className="text-[13px] text-gray-500">Email</p>
          <input
            type="email"
            className="w-full mb-3 p-2 border border-gray-300 rounded"
          />
          <p className="text-[13px] text-gray-500">Password</p>
          <input
            type="password"
            className="w-full mb-3 p-2 border border-gray-300 rounded"
          />
          <p className="text-[13px] text-gray-500">Confirm Password</p>
          <input
            type="password"
            className="w-full mb-4 p-2 border border-gray-300 rounded"
          />
          <div className="pb-4">
            <button className="w-full bg-black text-white py-2 rounded mt-4" onClick={MainScreen}>
              Sign Up
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
                          src="/images/googleIcon.png" // your Google icon path
                          alt="Google Icon"
                          width={16}
                          height={16}
                          className="w-4 h-4"
                        />
                        Sign in with Google
                      </button>
                    </div>
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
