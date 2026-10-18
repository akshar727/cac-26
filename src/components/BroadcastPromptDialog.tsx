"use client";
import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function BroadcastPromptDialog() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [config, setConfig] = React.useState<{
    defaultValue: string;
    message: string;
    callback: (name: string | null) => void;
  } | null>(null);

  const [userInput, setUserInput] = React.useState<string>("");

  React.useEffect(() => {
    const handlePrompt = (e: Event) => {
      const { message, defaultValue, callback } = (e as CustomEvent).detail;
      setConfig({ message, defaultValue, callback });
      setUserInput(defaultValue);
      setDialogOpen(true);
    };

    window.addEventListener("broadcast-prompt", handlePrompt);

    return () => {
      window.removeEventListener("broadcast-prompt", handlePrompt);
    };
  }, []);

  const isRename = config?.message.startsWith("Rename") ?? false;

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => !open && setDialogOpen(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isRename ? "Rename message" : "New message"}</DialogTitle>
          <DialogDescription>
            {isRename
              ? "Pick a new name for this message."
              : "Messages let one sprite tell another sprite when to start."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!userInput.trim()) return;
            config?.callback(userInput.trim());
            setDialogOpen(false);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="broadcastInput">Message name</Label>
            <Input
              value={userInput}
              id="broadcastInput"
              autoFocus
              autoComplete="off"
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setUserInput(e.target.value)}
            ></Input>
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  onClick={() => {
                    config?.callback(null);
                    setDialogOpen(false);
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={!userInput.trim()}>
              {isRename ? "Rename" : "Create message"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
