import type { Runtime } from "@/runner/runtime";

const READY_TIMEOUT_MS = 3000;

export const STARTING_STATE_PAUSE_MS = 800;

function nextFrame() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => resolve()),
  );
}

export function pause(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

async function waitUntil(isReady: () => boolean, isCancelled: () => boolean) {
  const deadline = performance.now() + READY_TIMEOUT_MS;
  while (!isReady()) {
    if (isCancelled() || performance.now() >= deadline) return false;
    await nextFrame();
  }
  return true;
}

export function waitForStageCanvases(isCancelled: () => boolean) {
  return waitUntil(
    () =>
      document.getElementById("foregroundCanvas") !== null &&
      document.getElementById("backgroundCanvas") !== null,
    isCancelled,
  );
}

export function waitForCostumeImages(
  runtime: Runtime,
  isCancelled: () => boolean,
) {
  return waitUntil(
    () =>
      runtime._targets.every((target) =>
        target._costumes.every((image) => image.complete),
      ),
    isCancelled,
  );
}
