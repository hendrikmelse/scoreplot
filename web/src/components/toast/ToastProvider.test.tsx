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
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

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

  it("goes away by itself after a while", () => {
    renderToasts();
    showToast({ message: "Hello" });

    wait(7900);
    expect(screen.queryByText("Hello")).not.toBeNull();
    wait(200);
    expect(screen.queryByText("Hello")).toBeNull();
  });

  it("can be told how long to stay", () => {
    renderToasts();
    showToast({ message: "Quick", durationMs: 1000 });
    wait(1100);
    expect(screen.queryByText("Quick")).toBeNull();
  });

  it("runs the action when its button is pressed, and goes away", () => {
    const onAction = vi.fn();
    renderToasts();
    showToast({ message: "Deleted", actionLabel: "Undo", onAction });

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(onAction).toHaveBeenCalledTimes(1);
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

    expect(screen.queryByText("Deleted")).toBeNull();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("stays while the mouse is over it, and goes after it leaves", () => {
    renderToasts();
    showToast({ message: "Hold on" });
    const toast = screen.getByText("Hold on").closest(".toast")!;

    wait(5000);
    fireEvent.pointerEnter(toast, { pointerType: "mouse" });
    wait(60000);
    expect(screen.queryByText("Hold on")).not.toBeNull();

    fireEvent.pointerLeave(toast, { pointerType: "mouse" });
    wait(7900);
    expect(screen.queryByText("Hold on")).not.toBeNull();
    wait(200);
    expect(screen.queryByText("Hold on")).toBeNull();
  });

  it("is not held by a touch, which has no hover to let go of", () => {
    renderToasts();
    showToast({ message: "Tapped" });
    const toast = screen.getByText("Tapped").closest(".toast")!;

    fireEvent.pointerEnter(toast, { pointerType: "touch" });
    wait(8100);
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
    wait(8100);
    expect(screen.queryByText("Focused")).toBeNull();
  });

  it("can show several at once, but only the newest three", () => {
    renderToasts();
    for (const n of [1, 2, 3, 4]) showToast({ message: `Toast ${n}` });

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

    wait(5000);
    expect(screen.queryByText("Second")).toBeNull();
  });
});
