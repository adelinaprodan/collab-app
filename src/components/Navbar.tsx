"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Link className="font-semibold text-gray-900" href="/dashboard">
            Dashboard
          </Link>
          <Link className="text-gray-700 hover:text-gray-900" href="/projects">
            Projects
          </Link>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-gray-700 hover:text-gray-900"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
