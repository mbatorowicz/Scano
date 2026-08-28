import { redirect } from "next/navigation";

import { BottomNav } from "@/components/bottom-nav";
import { hasValidSession } from "@/lib/session";

export default async function MainLayout({ children }: LayoutProps<"/">) {
  // Proxy już odsiewa ruch bez sesji, ale sprawdzamy jeszcze raz na serwerze —
  // sam proxy nigdy nie powinien być jedyną warstwą kontroli dostępu.
  if (!(await hasValidSession())) {
    redirect("/login");
  }

  return (
    <>
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</div>
      <BottomNav />
    </>
  );
}
