import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Skanowanie",
};

export default function ScanPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Skanuj</h1>
        <p className="text-sm text-muted-foreground">
          Zrób zdjęcie faktury, a dane odczyta AI.
        </p>
      </header>

      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Aparat i formularz korekty pojawią się tutaj w Etapie 4.
        </CardContent>
      </Card>
    </div>
  );
}
