import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function friendlyMessage(message: string | null): string {
  if (!message) return "Something unexpected happened. Let's try that again.";
  if (message.includes("loop variable")) {
    return "A loop is using that variable, so it can't be changed inside the loop. Try a different variable.";
  }
  if (message.includes("ImproperVariableError")) {
    if (message.includes("is not a number")) {
      return "This block can only change a number. Check what is stored in the variable and try again.";
    }
    if (message.includes("not a string")) {
      return "This block can only add to text. Check what is stored in the variable and try again.";
    }
    return "This block needs a variable. Let's make one and try again.";
  }
  if (message.includes("MultipleBackdropError")) {
    return "There can only be one backdrop. Choose one backdrop and try again.";
  }
  if (message.includes("InvalidFieldError")) {
    return "One of the blocks has a value it can't use. Check that each spot has a number and try again.";
  }
  if (
    message.includes("TypeError") ||
    message.includes("undefined") ||
    message.includes("Cannot read")
  ) {
    return "A block is missing something. Look for an empty spot in your blocks and try again.";
  }
  return "Something in the code needs a small fix. Look over your blocks and try again.";
}

export function RuntimeErrorDialog({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your code stopped</DialogTitle>
          <DialogDescription>
            Your code stopped running. Here is what to check.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive whitespace-pre-wrap">
          {friendlyMessage(message)}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
