import Image from "next/image";

// app/page.tsx

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">
        Welcome to My Next.js App 🚀
      </h1>
      <p className="text-lg text-gray-600 mb-4">
        This is your custom screen. Build something awesome!
      </p>
      <button className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
        Get Started
      </button>
    </main>
  );
}
