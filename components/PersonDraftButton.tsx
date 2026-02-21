"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DraftSheet } from "@/components/draft-sheet";
import { Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/telemetry";

interface PersonDraftButtonProps {
  contactId: string;
  contactName: string | null;
  contactEmail: string;
  contactScore: number;
  contactRiskLabel: string;
}

export function PersonDraftButton(props: PersonDraftButtonProps) {
  const [open, setOpen] = useState(false);

  function handleOpen() {
    trackEvent("dashboard.draft.clicked", { contactId: props.contactId });
    setOpen(true);
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleOpen}
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
      >
        <Sparkles size={14} className="mr-2" />
        Draft Follow-Up
      </Button>

      <DraftSheet
        {...props}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
