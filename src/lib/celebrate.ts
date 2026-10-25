import confetti from "canvas-confetti";

export function celebrate() {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "1000",
  });
  document.body.appendChild(canvas);

  const fire = confetti.create(canvas, { resize: true, useWorker: false });
  const cleanup = () => {
    fire.reset();
    canvas.remove();
  };

  const result = fire({
    particleCount: 90,
    spread: 55,
    startVelocity: 28,
    ticks: 180,
    scalar: 0.8,
    origin: { y: 0.65 },
  });

  if (result) {
    void result.then(cleanup, cleanup);
  } else {
    window.setTimeout(cleanup, 4000);
  }
}
