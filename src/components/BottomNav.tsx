"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Search,
  Home,
  Briefcase,
  MessageSquare,
} from "lucide-react";

const BottomNav = () => {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home },
    { href: "/search", icon: Search },
    { href: "/profile", icon: User },
    { href: "/portfolio", icon: Briefcase },
    { href: "/chat", icon: MessageSquare },
  ];

  return (
    <nav
      className="fixed bottom-0 w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex justify-around items-center py-3 shadow-lg"
    >
      {navItems.map(({ href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-col items-center text-sm transition-transform duration-200 hover:scale-110 ${
            pathname === href ? "text-yellow-300" : "text-white"
          }`}
        >
          <Icon size={24} />
        </Link>
      ))}
    </nav>
  );
};

export default BottomNav;