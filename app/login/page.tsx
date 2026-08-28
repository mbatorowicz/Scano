import type { Metadata } from "next";
import { ScanLine } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Logowanie",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { dalej } = await searchParams;
  const redirectTo = typeof dalej === "string" ? dalej : "/";

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ScanLine className="size-7" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Scano</h1>
            <p className="text-sm text-muted-foreground">Skaner faktur</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dostęp do aplikacji</CardTitle>
            <CardDescription>
              Podaj hasło, żeby zobaczyć faktury i skanować nowe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm redirectTo={redirectTo} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
