import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SupportDialog } from "@/components/title-page/SupportDialog";

const options = [
  { name: "Ko-fi", description: "A one-off tip", url: "https://ko-fi.com/example" },
  { name: "GitHub Sponsors", description: "Monthly", url: "https://github.com/sponsors/example" },
];

// jsdom doesn't do modal dialogs, so this does just enough of it: open or not, and the close event
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

describe("SupportDialog", () => {
  it("is closed until it is opened, and lists every option as a link out", () => {
    const { container, rerender } = render(
      <SupportDialog open={false} options={options} onClose={() => {}} />,
    );
    expect(container.querySelector("dialog")!.hasAttribute("open")).toBe(false);

    rerender(<SupportDialog open options={options} onClose={() => {}} />);
    expect(container.querySelector("dialog")!.hasAttribute("open")).toBe(true);

    const links = container.querySelectorAll("a");
    expect([...links].map((a) => a.getAttribute("href"))).toEqual(options.map((o) => o.url));
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
    expect(links[0]!.textContent).toContain("Ko-fi");
    expect(links[0]!.textContent).toContain("A one-off tip");
  });

  it("closes with the close button", () => {
    const onClose = vi.fn();
    render(<SupportDialog open options={options} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close", hidden: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes with a tap on the dimmed page behind it, but not on the dialog's contents", () => {
    const onClose = vi.fn();
    const { container } = render(<SupportDialog open options={options} onClose={onClose} />);

    fireEvent.click(container.querySelector(".support-blurb")!);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector("dialog")!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("tells the page when the browser closes it itself, as Escape does", () => {
    const onClose = vi.fn();
    const { container } = render(<SupportDialog open options={options} onClose={onClose} />);
    fireEvent(container.querySelector("dialog")!, new Event("close"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
