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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "./ui/label";

type PromptKind = "new-variable" | "rename-variable" | "confirm";

function promptKindFor(message: string | undefined): PromptKind | null {
  if (!message) return null;
  if (message.startsWith("New variable name")) return "new-variable";
  if (message.startsWith("Rename all")) return "rename-variable";
  return "confirm";
}

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
      setUserInput(defaultValue ?? "");
      setIsOpen(true);
    };

    window.addEventListener("blockly-prompt", handlePrompt);

    return () => {
      window.removeEventListener("blockly-prompt", handlePrompt);
    };
  }, []);
  const [scope, setScope] = React.useState<"local" | "global">("local");

  const kind = promptKindFor(config?.message);
  const needsName = kind === "new-variable" || kind === "rename-variable";
  const isDelete = kind === "confirm" && config?.message.startsWith("Delete");

  const title =
    kind === "new-variable"
      ? "New variable"
      : kind === "rename-variable"
        ? "Rename variable"
        : config?.message;

  const description =
    kind === "rename-variable"
      ? config?.message.replace(/:$/, "")
      : isDelete
        ? "You cannot undo this."
        : undefined;

  const submitLabel =
    kind === "new-variable"
      ? "Create variable"
      : kind === "rename-variable"
        ? "Rename"
        : isDelete
          ? "Delete"
          : "OK";

  const cancel = () => {
    if (kind === "new-variable") {
      config?.callback(null, false);
    } else if (kind === "confirm") {
      //@ts-ignore
      config?.callback(false);
    } else {
      //@ts-ignore
      config?.callback(null);
    }
    setIsOpen(false);
  };

  const confirm = () => {
    if (kind === "new-variable") {
      config?.callback(userInput.trim(), scope === "global");
    } else if (kind === "confirm") {
      //@ts-ignore
      config?.callback(true);
    } else {
      //@ts-ignore
      config?.callback(userInput.trim());
    }
    setIsOpen(false);
  };

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
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (needsName && !userInput.trim()) return;
            confirm();
          }}
        >
          {needsName && (
            <div className="grid gap-2">
              <Label htmlFor="variableName">Variable name</Label>
              <Input
                value={userInput}
                id="variableName"
                autoFocus
                autoComplete="off"
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setUserInput(e.target.value)}
              ></Input>
            </div>
          )}
          {kind === "new-variable" && (
            <RadioGroup
              value={scope}
              onValueChange={(value) => setScope(value as "local" | "global")}
              className="grid grid-cols-2 gap-2"
              defaultValue="local"
              aria-label="Variable scope"
            >
              <Label
                htmlFor="variable-scope-local"
                className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 hover:bg-muted"
              >
                <RadioGroupItem value="local" id="variable-scope-local" />
                This sprite only
              </Label>
              <Label
                htmlFor="variable-scope-global"
                className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 hover:bg-muted"
              >
                <RadioGroupItem value="global" id="variable-scope-global" />
                All sprites
              </Label>
            </RadioGroup>
          )}
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" onClick={cancel} variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button
              type="submit"
              disabled={needsName && !userInput.trim()}
              variant={isDelete ? "destructive" : "default"}
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
