"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { captureProductEvent } from "@/lib/product-analytics";

export function AccountExportLink() {
  return (
    <Button asChild className="mt-4 w-full sm:w-auto" variant="outline">
      <a
        href="/api/account/export"
        onClick={() => captureProductEvent("account export requested", {})}
      >
        <Download className="size-4" />
        Export my data
      </a>
    </Button>
  );
}
