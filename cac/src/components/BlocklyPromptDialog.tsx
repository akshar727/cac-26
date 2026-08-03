import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BlocklyPromptDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<{
    message: string;
    defaultValue: string;
    callback: (value: string | null) => void;
  } | null>(null);
  const [userInput, setUserInput] = React.useState("");

  React.useEffect(() => {
    const handlePrompt = (e: Event) => {
      const { message, defaultValue, callback } = (e as CustomEvent).detail;
      setConfig({ message, defaultValue, callback });
      setIsOpen(true);
    };

    window.addEventListener("blockly-prompt", handlePrompt);

    return () => {
      window.removeEventListener("blockly-prompt", handlePrompt);
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config?.message}</DialogTitle>
        </DialogHeader>
        <Input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        ></Input>
        <DialogFooter>
          <DialogClose
            render={
              <Button
                onClick={() => {
                  config?.callback(null);
                  setIsOpen(false);
                }}
                variant="outline"
              >
                Cancel
              </Button>
            }
          />
          <Button
            onClick={() => {
              config?.callback(userInput);
              setIsOpen(false);
            }}
          >
            Ok
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
