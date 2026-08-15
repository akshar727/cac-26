import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "./ui/label";

export function BlocklyVariablePromptDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<{
    message: string;
    defaultValue: string;
    callback: (
      name: string | null,
      isGlobal: boolean,
    ) => void | ((value: string) => void);
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
  const [scope, setScope] = React.useState<"local" | "global">("local");

  return (
    <Dialog
      open={isOpen}
      onOpenChangeComplete={(newState) => {
        if (newState === false) {
          setScope("local");
          setUserInput("");
          setConfig(null);
        }
      }}
      onOpenChange={(open) => !open && setIsOpen(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config?.message}</DialogTitle>
        </DialogHeader>
        <Input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        ></Input>
        {config?.message?.startsWith("New variable name") && (
          <RadioGroup
            value={scope}
            onValueChange={(value) => setScope(value as "local" | "global")}
            className="flex flex-row gap-2"
            defaultValue="local"
          >
            <div className="flex flex-row items-center gap-2">
              <RadioGroupItem value="local" id="local" />
              <Label htmlFor="local">This Sprite Only</Label>
            </div>
            <div className="flex flex-row items-center gap-2">
              <RadioGroupItem value="global" id="global" />
              <Label htmlFor="global">All Sprites</Label>
            </div>
          </RadioGroup>
        )}
        <DialogFooter>
          <DialogClose
            render={
              <Button
                onClick={() => {
                  if (config?.message?.startsWith("New variable name")) {
                    config?.callback(null, false);
                  } else {
                    //@ts-ignore
                    config?.callback(null);
                  }
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
              if (config?.message?.startsWith("New variable name")) {
                config?.callback(userInput, scope === "global");
              } else {
                //@ts-ignore
                config?.callback(userInput);
              }
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
