import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SupportDialog } from "@/components/title-page/SupportDialog";

const options = [
  { name: "Ko-fi", description: "A one-off tip", url: "https://ko-fi.com/example" },
  {
    name: "Venmo",
    description: "A tip",
    url: "https://venmo.com/u/example",
    qrCode: "data:image/svg+xml,qr",
  },
  {
    name: "PayPal",
    description: "Any amount",
    url: "https://paypal.me/example",
    qrCode: "data:image/svg+xml,qr2",
  },
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

  it("shows an option's QR code on request, and hides it again", () => {
    const { container } = render(<SupportDialog open options={options} onClose={() => {}} />);
    expect(container.querySelector(".support-qr")).toBeNull();
    // Only the options that have a code have the button
    expect(screen.queryAllByRole("button", { name: /QR code/, hidden: true })).toHaveLength(2);
    // Beside its link, not inside it, as a button can't be inside a link
    expect(container.querySelector("a button")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Show QR code", hidden: true })[0]!);
    const code = container.querySelector<HTMLImageElement>(".support-qr img")!;
    expect(code.getAttribute("src")).toBe("data:image/svg+xml,qr");
    expect(code.getAttribute("alt")).toBe("QR code for Venmo");
    const toggle = screen.getByRole("button", { name: "Hide QR code", hidden: true });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(toggle);
    expect(container.querySelector(".support-qr")).toBeNull();
  });

  it("shows one QR code at a time, so that opening another closes the first", () => {
    const { container } = render(<SupportDialog open options={options} onClose={() => {}} />);
    const showing = () =>
      [...container.querySelectorAll(".support-qr img")].map((img) => img.getAttribute("alt"));
    const toggle = (name: string) =>
      fireEvent.click(screen.getByRole("button", { name, hidden: true }));

    fireEvent.click(screen.getAllByRole("button", { name: "Show QR code", hidden: true })[0]!);
    expect(showing()).toEqual(["QR code for Venmo"]);

    fireEvent.click(screen.getAllByRole("button", { name: "Show QR code", hidden: true })[0]!);
    expect(showing()).toEqual(["QR code for PayPal"]);
    expect(screen.getAllByRole("button", { name: "Show QR code", hidden: true })).toHaveLength(1);

    toggle("Hide QR code");
    expect(showing()).toEqual([]);
  });

  it("opens again with no QR code showing", () => {
    const { container, rerender } = render(
      <SupportDialog open options={options} onClose={() => {}} />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Show QR code", hidden: true })[0]!);
    expect(container.querySelector(".support-qr")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Close", hidden: true }));
    rerender(<SupportDialog open={false} options={options} onClose={() => {}} />);
    rerender(<SupportDialog open options={options} onClose={() => {}} />);
    expect(container.querySelector(".support-qr")).toBeNull();
  });
});
