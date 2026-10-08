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
  if (message.includes("Division by zero")) {
    return "A block tried to divide by zero. Try a different number and run it again.";
  }
  if (
    message.includes("square root of negative") ||
    message.includes("logarithm") ||
    message.includes("arcsine") ||
    message.includes("arccosine")
  ) {
    return "A math block was given a number it can't use. Try a different number and run it again.";
  }
  if (message.includes("Invalid constraint values")) {
    return "A block that keeps a number between two values has a low number bigger than its high number. Swap them and try again.";
  }
  if (message.includes("is not defined in the current context")) {
    return "A block is using a variable that doesn't exist yet. Make the variable first, then try again.";
  }
  if (message.includes("Target sprite not found")) {
    return "A block points to a sprite that isn't in this project. Pick a sprite from the block's list and try again.";
  }
  if (message.includes("Cannot compare null")) {
    return "A comparison block has an empty spot. Fill it in and try again.";
  }
  if (
    message.includes("Canvas element not found") ||
    message.includes("2D context")
  ) {
    return "The Screen tab is not ready yet. Open the Screen tab and press Run Code again.";
  }
  if (message.includes("NoProcessingThreadError")) {
    return "Your code couldn't start. Press Stop, then Run Code again.";
  }
  if (
    message.includes("RangeError") ||
    message.includes("Maximum call stack")
  ) {
    return "Your code kept calling itself without stopping. Check your custom blocks and try again.";
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
