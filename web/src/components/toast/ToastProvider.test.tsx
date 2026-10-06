import { useEffect } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { useToast, type ToastOptions } from "@/ToastContext";

/** Gives the test a way to show toasts from outside the component tree */
let show: (options: ToastOptions) => void = () => {};
function Harness({ expose }: { expose: (showToast: (options: ToastOptions) => void) => void }) {
  const { showToast } = useToast();
  useEffect(() => expose(showToast), [expose, showToast]);
  return null;
}

function renderToasts() {
  return render(
    <ToastProvider>
      <Harness
        expose={(showToast) => {
          show = showToast;
        }}
      />
    </ToastProvider>,
  );
}

const showToast = (options: ToastOptions) => act(() => show(options));
/** In small steps, as a toast's timers each start in response to the one before it finishing */
const wait = (ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    act(() => vi.advanceTimersByTime(Math.min(50, ms - elapsed)));
  }
};
/** A little longer than a toast takes to fall away */
const FALL_MS = 400;

describe("toasts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a message, in a live region so that it is announced", () => {
    const { container } = renderToasts();
    showToast({ message: "Hello there" });

    expect(screen.getByText("Hello there")).toBeTruthy();
    expect(container.querySelector('[role="status"]')!.textContent).toContain("Hello there");
  });

  it("fades after a couple of seconds, and falls away after a few more", () => {
    renderToasts();
    showToast({ message: "Hello" });
    const toast = () => screen.getByText("Hello").closest(".toast")!;

    wait(1900);
    expect(toast().classList.contains("faded")).toBe(false);
    wait(200);
    expect(toast().classList.contains("faded")).toBe(true);

    wait(3800); // 5.9 seconds
    expect(toast().classList.contains("leaving")).toBe(false);
    wait(200);
    expect(toast().classList.contains("leaving")).toBe(true);
    expect(screen.queryByText("Hello")).not.toBeNull(); // Still falling

    wait(FALL_MS);
    expect(screen.queryByText("Hello")).toBeNull();
  });

  it("can be told how long to stay", () => {
    renderToasts();
    showToast({ message: "Quick", durationMs: 1000 });
    wait(1000 + FALL_MS + 50);
    expect(screen.queryByText("Quick")).toBeNull();
  });

  it("runs the action when its button is pressed, and goes away", () => {
    const onAction = vi.fn();
    renderToasts();
    showToast({ message: "Deleted", actionLabel: "Undo", onAction });

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    wait(FALL_MS);
    expect(screen.queryByText("Deleted")).toBeNull();
  });

  it("has no action button unless it was given one", () => {
    renderToasts();
    showToast({ message: "Just so you know" });
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1); // Only the dismiss button
  });

  it("can be dismissed", () => {
    const onAction = vi.fn();
    renderToasts();
    showToast({ message: "Deleted", actionLabel: "Undo", onAction });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    wait(FALL_MS);
    expect(screen.queryByText("Deleted")).toBeNull();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("stays while the mouse is over it, and fades again as soon as it leaves", () => {
    renderToasts();
    showToast({ message: "Hold on" });
    const toast = screen.getByText("Hold on").closest(".toast")!;

    wait(3000);
    expect(toast.classList.contains("faded")).toBe(true);
    fireEvent.pointerEnter(toast, { pointerType: "mouse" });
    expect(toast.classList.contains("faded")).toBe(false); // Fully there again
    wait(60000);
    expect(screen.queryByText("Hold on")).not.toBeNull();

    // No fresh couple of seconds: it is back to faded at once, with its time to go starting over
    fireEvent.pointerLeave(toast, { pointerType: "mouse" });
    expect(toast.classList.contains("faded")).toBe(true);
    wait(3900);
    expect(toast.classList.contains("leaving")).toBe(false);
    wait(200);
    expect(toast.classList.contains("leaving")).toBe(true);
    wait(FALL_MS);
    expect(screen.queryByText("Hold on")).toBeNull();
  });

  it("is brought back by a touch, which has the couple of seconds again", () => {
    renderToasts();
    showToast({ message: "Tapped" });
    const toast = screen.getByText("Tapped").closest(".toast")!;

    wait(3000);
    expect(toast.classList.contains("faded")).toBe(true);
    fireEvent.pointerDown(toast, { pointerType: "touch" });
    expect(toast.classList.contains("faded")).toBe(false);

    wait(1900);
    expect(toast.classList.contains("faded")).toBe(false);
    wait(200);
    expect(toast.classList.contains("faded")).toBe(true);
  });

  it("is not held by a touch, which has no hover to let go of", () => {
    renderToasts();
    showToast({ message: "Tapped" });
    const toast = screen.getByText("Tapped").closest(".toast")!;

    fireEvent.pointerEnter(toast, { pointerType: "touch" });
    wait(6000 + FALL_MS);
    expect(screen.queryByText("Tapped")).toBeNull();
  });

  it("stays while the keyboard focus is in it", () => {
    renderToasts();
    showToast({ message: "Focused", actionLabel: "Undo" });
    const undo = screen.getByRole("button", { name: "Undo" });

    fireEvent.focus(undo);
    wait(60000);
    expect(screen.queryByText("Focused")).not.toBeNull();

    fireEvent.blur(undo);
    wait(6000 + FALL_MS + 50);
    expect(screen.queryByText("Focused")).toBeNull();
  });

  it("can show several at once, but the oldest falls away when there are more than three", () => {
    renderToasts();
    for (const n of [1, 2, 3, 4]) showToast({ message: `Toast ${n}` });

    expect(screen.getByText("Toast 1").closest(".toast")!.classList.contains("leaving")).toBe(true);
    wait(FALL_MS);
    expect(screen.queryByText("Toast 1")).toBeNull();
    for (const n of [2, 3, 4]) expect(screen.queryByText(`Toast ${n}`)).not.toBeNull();
  });

  it("times each one separately, and a new one does not restart the others", () => {
    renderToasts();
    showToast({ message: "First" });
    wait(5000);
    showToast({ message: "Second" });

    wait(3100); // 8.1 seconds after the first, 3.1 after the second
    expect(screen.queryByText("First")).toBeNull();
    expect(screen.queryByText("Second")).not.toBeNull();

    wait(4000);
    expect(screen.queryByText("Second")).toBeNull();
  });

  it("can send all of them away at once", () => {
    function DismissAllButton() {
      const { dismissAll } = useToast();
      return <button onClick={dismissAll}>Clear</button>;
    }
    render(
      <ToastProvider>
        <Harness
          expose={(showToast) => {
            show = showToast;
          }}
        />
        <DismissAllButton />
      </ToastProvider>,
    );
    showToast({ message: "One" });
    showToast({ message: "Two" });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByText("One").closest(".toast")!.classList.contains("leaving")).toBe(true);
    wait(FALL_MS);
    expect(screen.queryByText("One")).toBeNull();
    expect(screen.queryByText("Two")).toBeNull();
  });
});
