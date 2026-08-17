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
        <Label htmlFor="broadcastInput">Message Name</Label>
        <Input
          value={userInput}
          id="broadcastInput"
          defaultValue={config?.defaultValue}
          onChange={(e) => setUserInput(e.target.value)}
        ></Input>
        <DialogFooter>
          <DialogClose
            render={
              <Button
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
          <Button
            onClick={() => {
              if (config?.message?.startsWith("New variable name")) {
                config?.callback(userInput);
              } else {
                //@ts-ignore
                config?.callback(userInput);
              }
              setDialogOpen(false);
            }}
          >
            Ok
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
