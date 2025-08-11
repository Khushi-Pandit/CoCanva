export default function LoginPage() {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-emerald-100 pt-9 pb-9 pl-22 pr-22">
      <div className="bg-white rounded-2xl shadow-lg w-330 h-143 flex">
        <div className="w-1/2 bg-emerald-200 rounded-l-2xl overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <img
              src="/images/login.gif"
              alt="Login Image"
              className="w-full h-full object-cover text-white"
            />
          </div>
        </div>
        <div className="w-1/2 pt-13 pl-25 pr-25 pb-20">
          <h1 className="flex items-center justify-center text-[30px] pb-10 text-black">
            IdeaSplash
          </h1>
          <p className="text-[14px] text-gray-500">Username or Email</p>
          <input
            type="text"
            className="w-full mt-1 mb-4 p-2 border border-gray-300 rounded"
          />
          <p className="text-[14px] text-gray-500">Password</p>
          <input
            type="text"
            className="w-full mt-1 mb-1 p-2 border border-gray-300 rounded"
          />
          <p className="text-[13px] text-green-500 flex justify-end underline">
            Forgot Password?
          </p>
          <div className="pb-8">
            <button className="w-full bg-black text-white py-2 rounded mt-4">
              Sign In
            </button>
          </div>
          <div className="flex items-center gap-4">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="text-gray-500 text-sm">OR</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>
          <div className="flex items-center justify-center mt-4">
            <button className="text-[13px] text-black px-4 py-2 rounded">
              Sign in with Google
            </button>
          </div>
          <div className="flex justify-center gap-1 text-[13px] text-black mt-4">
            <p>Are you new?</p>
            <p className="text-green-500 underline cursor-pointer">
              Create an Account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
