import type { Metadata } from "next";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Ustawienia",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ustawienia</h1>
        <p className="text-sm text-muted-foreground">
          Stawka prowizji i dostęp do aplikacji.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Prowizja</CardTitle>
          <CardDescription>
            Ustawienie stawki procentowej pojawi się tutaj w Etapie 5.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sesja</CardTitle>
          <CardDescription>
            Wylogowanie usuwa ciasteczko sesji z tego urządzenia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logout}>
            <Button type="submit" variant="outline" className="h-12 text-base">
              <LogOut className="size-5" />
              Wyloguj
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
