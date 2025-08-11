import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <div className="h-screen grid place-items-center bg-gray-100">
        <Link
          href="/login"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go to Login
        </Link>
      </div>
    </main>
  );
}
