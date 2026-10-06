import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FullscreenButton } from "@/components/FullscreenButton";

/** jsdom has no Fullscreen API, so this is a small stand-in for one */
function stubFullscreen() {
  let element: Element | null = null;
  const requestFullscreen = vi.fn(async () => {
    element = document.documentElement;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  const exitFullscreen = vi.fn(async () => {
    element = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  Object.defineProperty(document, "fullscreenEnabled", { value: true, configurable: true });
  Object.defineProperty(document, "fullscreenElement", {
    get: () => element,
    configurable: true,
  });
  document.documentElement.requestFullscreen = requestFullscreen;
  document.exitFullscreen = exitFullscreen;
  return {
    requestFullscreen,
    exitFullscreen,
    leaveWithEscape: () => {
      element = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    },
  };
}

describe("FullscreenButton", () => {
  afterEach(() => {
    // @ts-expect-error: removing what the stub added
    delete document.fullscreenEnabled;
    // @ts-expect-error: removing what the stub added
    delete document.fullscreenElement;
  });

  it("is not there where the browser cannot do fullscreen", () => {
    const { container } = render(<FullscreenButton className="x" />);
    expect(container.childElementCount).toBe(0);
  });

  it("enters and exits fullscreen, and says which it will do", async () => {
    const user = userEvent.setup();
    const fullscreen = stubFullscreen();
    render(<FullscreenButton className="x" />);

    await user.click(screen.getByRole("button", { name: "Enter fullscreen" }));
    expect(fullscreen.requestFullscreen).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Exit fullscreen" }));
    expect(fullscreen.exitFullscreen).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Enter fullscreen" })).not.toBeNull();
  });

  it("follows the browser when fullscreen is left some other way", async () => {
    const user = userEvent.setup();
    const fullscreen = stubFullscreen();
    render(<FullscreenButton className="x" />);
    await user.click(screen.getByRole("button", { name: "Enter fullscreen" }));

    act(() => fullscreen.leaveWithEscape());
    expect(screen.queryByRole("button", { name: "Enter fullscreen" })).not.toBeNull();
  });
});
