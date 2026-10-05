import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

type User = ReturnType<typeof userEvent.setup>;

function renderApp(path = "/play/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** The score shown for each player, in list order */
function shownScores(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".player .score")).map((el) => el.textContent);
}

/** Add a second player ("Player 2") through edit mode, then leave edit mode */
async function addSecondPlayer(user: User, container: HTMLElement) {
  await user.click(container.querySelector(".button-edit")!);
  await user.click(container.querySelector(".add-player-button")!);
  await user.click(container.querySelector(".button-edit")!);
}

describe("title page", () => {
  it("starts a new game with one player, in edit mode", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/");

    await user.click(screen.getByText("Start New Game"));

    expect(container.querySelectorAll(".player")).toHaveLength(1);
    expect(container.querySelector<HTMLInputElement>(".player-name-input")!.value).toBe("Player 1");
    expect(screen.getByText("Edit Players")).toBeTruthy();
    expect(container.querySelector(".player.editing")).not.toBeNull();
  });

  it("starts a new game with the game name selected", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/");

    await user.click(screen.getByText("Start New Game"));

    const input = container.querySelector<HTMLInputElement>(".game-name-input")!;
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, input.value.length]);

    // Typing replaces the whole name
    await user.keyboard("Rummy");
    expect(input.value).toBe("Rummy");
  });

  it("does not select the game name when entering edit mode later", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    await user.click(container.querySelector(".button-edit")!);

    expect(document.activeElement).not.toBe(container.querySelector(".game-name-input"));
  });

  it("starts a new game even after playing one", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/");

    await user.click(screen.getByText("Start New Game"));
    await user.click(container.querySelector(".add-player-button")!);
    expect(container.querySelectorAll(".player")).toHaveLength(2);

    await user.click(container.querySelector(".button-home")!);
    await user.click(screen.getByText("Start New Game"));
    expect(container.querySelectorAll(".player")).toHaveLength(1);
  });

  it("continues the current game outside of edit mode", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/");

    await user.click(screen.getByText("Continue Game"));

    expect(container.querySelector(".player.editing")).toBeNull();
    expect(screen.queryByText("Edit Players")).toBeNull();
  });
});

describe("game play page", () => {
  it("renders the player and the game name", () => {
    renderApp();
    expect(screen.getByText("New Game")).toBeTruthy();
    expect(screen.getByText("Player 1")).toBeTruthy();
  });

  it("selects the first player by default", () => {
    const { container } = renderApp();
    const selected = container.querySelectorAll(".player.selected");
    expect(selected).toHaveLength(1);
    expect(selected[0]!.textContent).toContain("Player 1");
  });

  it("adds a new player in edit mode and starts editing its name", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    await user.click(container.querySelector(".button-edit")!);
    await user.click(container.querySelector(".add-player-button")!);

    const input = document.activeElement as HTMLInputElement;
    expect(input.className).toBe("player-name-input");
    expect(input.value).toBe("Player 2");
  });

  it("shows names as plain text normally and as text boxes in edit mode", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    expect(container.querySelector(".player-name-input")).toBeNull();
    expect(container.querySelector(".game-name-input")).toBeNull();

    await user.click(container.querySelector(".button-edit")!);
    expect(container.querySelector<HTMLInputElement>(".player-name-input")!.value).toBe("Player 1");
    expect(container.querySelector<HTMLInputElement>(".game-name-input")!.value).toBe("New Game");

    await user.click(container.querySelector(".button-edit")!);
    expect(container.querySelector(".player-name-input")).toBeNull();
    expect(container.querySelector(".game-name-input")).toBeNull();
  });

  it("renames the game and players from their text boxes", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    await user.click(container.querySelector(".button-edit")!);
    await user.clear(container.querySelector(".game-name-input")!);
    await user.type(container.querySelector(".game-name-input")!, "Rummy");
    await user.clear(container.querySelector(".player-name-input")!);
    await user.type(container.querySelector(".player-name-input")!, "Ada{Enter}");
    await user.click(container.querySelector(".button-edit")!);

    expect(screen.getByText("Rummy")).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
  });

  it("enters scores with the keyboard and moves on to the next player", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();
    await addSecondPlayer(user, container);

    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(container.querySelector(".player.selected")!.textContent).toContain("Player 2");

    fireEvent.keyDown(window, { key: "-" });
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(container.querySelector(".player.selected")!.textContent).toContain("Player 1");

    expect(shownScores(container)).toEqual(["5", "-3"]);
  });

  it("does not type into the keypad while renaming a player", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    await user.click(container.querySelector(".button-edit")!);
    await user.click(container.querySelector(".player-name-input")!);
    await user.keyboard("7{Enter}");

    expect(container.querySelector<HTMLInputElement>(".score-input")!.value).toBe("0");
  });

  it("switches between the keypad, plot and table", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();
    const [, plot, table] = Array.from(container.querySelectorAll(".buttons-section button"));

    await user.click(table!);
    expect(container.querySelector(".score-table-content")).not.toBeNull();
    await user.click(plot!);
    expect(container.querySelector(".plot-scores-content")).not.toBeNull();
  });

  it("can switch to the plot after deleting every player", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    await user.click(container.querySelector(".button-edit")!);
    for (const button of Array.from(container.querySelectorAll(".delete-button"))) {
      await user.click(button);
    }
    await user.click(container.querySelector(".button-edit")!);
    await user.click(container.querySelectorAll(".buttons-section button")[1]!);

    expect(container.querySelector(".plot-scores-content")).not.toBeNull();
  });
});
