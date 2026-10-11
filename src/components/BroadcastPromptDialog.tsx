"use client";
import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
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

  const [userInput, setUserInput] = React.useState<string>(
    config?.defaultValue || "",
  );

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
  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => !open && setDialogOpen(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config?.message}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            config?.callback(userInput);
            setDialogOpen(false);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="broadcastInput">Message Name</Label>
            <Input
              value={userInput}
              id="broadcastInput"
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
            <Button type="submit">Ok</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
