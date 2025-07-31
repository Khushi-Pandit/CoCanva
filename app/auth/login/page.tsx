import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-mint-light font-sans">
      <div className="flex flex-col md:flex-row w-full max-w-6xl bg-white rounded-2xl shadow-lg overflow-hidden">
        
        {/* Left Illustration Panel */}
        <div className="md:w-1/2 bg-mint p-10 flex flex-col justify-center items-center text-center">
          <Image
            src="/illustration.svg"
            alt="Student Illustration"
            width={350}
            height={350}
            className="mb-6"
          />
          <h2 className="text-2xl font-semibold text-charcoal text-gray-500">Exam Mastery Hub</h2>
          <p className="text-sm text-gray-600 mt-2 max-w-sm">
            Unleash Your Academic Success with Exam Mastery Hub’s Exam Excellence Platform
          </p>
          <div className="flex mt-6 gap-2">
            <span className="h-2 w-2 bg-charcoal rounded-full"></span>
            <span className="h-2 w-2 bg-gray-300 rounded-full"></span>
            <span className="h-2 w-2 bg-gray-300 rounded-full"></span>
          </div>
        </div>

        {/* Right Login Form Panel */}
        <div className="md:w-1/2 p-10">
          <h1 className="text-3xl font-bold text-center mb-6 text-charcoal">
            <span className="text-gray-700">MASTERY</span> <span className="text-gray-400">HUB</span>
          </h1>

          <form className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700">Username or email</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-mint-dark"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700">Password</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-md px-4 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-mint-dark"
              />
            </div>

            <div className="text-right text-sm">
              <a href="#" className="text-gray-600 hover:underline">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="w-full bg-charcoal text-white font-medium py-2 rounded-md bg-gray-800"
            >
              Sign in
            </button>
          </form>

          <div className="flex items-center my-6">
            <hr className="flex-grow border-gray-400" />
            <span className="mx-2 text-gray-600 text-sm">or</span>
            <hr className="flex-grow border-gray-400" />
          </div>

          <button className="w-full border border-gray-300 py-2 rounded-md flex justify-center items-center gap-2 text-sm hover:bg-gray-100">
            <Image
              src="/google-icon.svg" // Replace with actual Google icon
              alt="Google"
              width={20}
              height={20}
            />
            Sign in with Google
          </button>

          <p className="text-sm text-center text-gray-500 mt-6">
            Are you new? <a href="/signup" className="text-mint-dark hover:underline">Create an Account</a>
          </p>
        </div>
      </div>
    </div>
  );
}
