"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, ReceiptText, Settings, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: "/" | "/invoices" | "/settlements" | "/settings";
  label: string;
  icon: LucideIcon;
};

const items: NavItem[] = [
  { href: "/", label: "Skanuj", icon: Camera },
  { href: "/invoices", label: "Faktury", icon: ReceiptText },
  { href: "/settlements", label: "Rozliczenia", icon: Wallet },
  { href: "/settings", label: "Ustawienia", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Nawigacja główna"
      className="sticky bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-3xl">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
