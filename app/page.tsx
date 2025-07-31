'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const goToLogin = () => {
    router.push('/auth/login');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <button
        onClick={goToLogin}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Go to Login
      </button>
    </main>
  );
}
