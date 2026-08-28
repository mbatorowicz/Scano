import Link from "next/link";
import { Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Faktury</h1>
        <p className="text-sm text-muted-foreground">
          Lista zeskanowanych faktur wraz z sumą prowizji.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nie ma tu jeszcze żadnej faktury. Zacznij od zrobienia zdjęcia.
          </p>
          <Button asChild className="h-12 px-6 text-base">
            <Link href="/scan">
              <Camera className="size-5" />
              Skanuj fakturę
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
