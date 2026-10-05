import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

function renderPlayPage() {
  return render(
    <MemoryRouter initialEntries={["/play/"]}>
      <App />
    </MemoryRouter>,
  );
}

describe("game play page", () => {
  it("renders the players and the game name", () => {
    renderPlayPage();
    expect(screen.getByText("My Test Game")).toBeTruthy();
    expect(screen.getByText("Hendrik")).toBeTruthy();
    expect(screen.getByText("Alida")).toBeTruthy();
  });

  it("selects the first player by default", () => {
    const { container } = renderPlayPage();
    const selected = container.querySelectorAll(".player.selected");
    expect(selected).toHaveLength(1);
    expect(selected[0]!.textContent).toContain("Hendrik");
  });

  it("adds a new player in edit mode and starts editing its name", async () => {
    const user = userEvent.setup();
    const { container } = renderPlayPage();

    await user.click(container.querySelector(".button-edit")!);
    await user.click(container.querySelector(".add-player-button")!);

    const input = container.querySelector<HTMLInputElement>(".player-name-input");
    expect(input?.value).toBe("Player 3");
  });
});
