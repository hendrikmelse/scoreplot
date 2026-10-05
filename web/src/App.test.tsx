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

describe("demo game", () => {
  it("is only loaded when the URL asks for it", () => {
    renderApp("/");
    expect(screen.queryByText("Friday Night Rummy")).toBeNull();
  });

  it("loads with ?demo, and plays from its latest round", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/?demo");

    expect(screen.getByText("Friday Night Rummy")).toBeTruthy();
    await user.click(screen.getByText("Continue Game"));

    expect(container.querySelectorAll(".player")).toHaveLength(4);
    expect(container.querySelector(".round-label")!.textContent).toBe("Round 8");
    expect(shownScores(container)).toEqual(["28", "0", "-8", "5"]);
  });

  it("shows the whole game in the score table", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/?demo");

    await user.click(screen.getByText("Continue Game"));
    await user.click(container.querySelectorAll(".buttons-section button")[2]!);

    expect(container.querySelectorAll("tbody tr")).toHaveLength(8); // No Start row: all zeros
    expect(
      Array.from(container.querySelectorAll(".total-cell")).map((el) => el.textContent),
    ).toEqual(["75", "85", "83", "93"]);
  });
});

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

  describe("score table", () => {
    /** Two players; Player 1 scores 5 then -2, Player 2 scores 3 then 4. Ends on the table. */
    async function playTwoRounds() {
      const user = userEvent.setup();
      const view = renderApp();
      await addSecondPlayer(user, view.container);
      for (const keys of [["5"], ["3"]]) {
        for (const key of keys) fireEvent.keyDown(window, { key });
        fireEvent.keyDown(window, { key: "Enter" });
      }
      fireEvent.keyDown(window, { key: "ArrowRight" });
      for (const keys of [["-", "2"], ["4"]]) {
        for (const key of keys) fireEvent.keyDown(window, { key });
        fireEvent.keyDown(window, { key: "Enter" });
      }
      await user.click(view.container.querySelectorAll(".buttons-section button")[2]!);
      return { user, ...view };
    }

    const texts = (els: NodeListOf<Element>) => Array.from(els).map((el) => el.textContent);

    it("shows a row per round, with round labels, player headers and totals", async () => {
      const { container } = await playTwoRounds();

      expect(texts(container.querySelectorAll(".player-header"))).toEqual(["Player 1", "Player 2"]);
      expect(texts(container.querySelectorAll("tbody .round-label"))).toEqual(["1", "2"]);
      expect(texts(container.querySelectorAll("tbody tr:nth-child(1) .score-cell"))).toEqual([
        "5",
        "3",
      ]);
      expect(texts(container.querySelectorAll("tbody tr:nth-child(2) .score-cell"))).toEqual([
        "-2",
        "4",
      ]);
      expect(texts(container.querySelectorAll(".total-cell"))).toEqual(["3", "7"]);
    });

    it("hides the Start row while everybody's starting score is zero", async () => {
      const { container } = await playTwoRounds();

      expect(container.querySelector(".start-row")).toBeNull();
      expect(texts(container.querySelectorAll("tbody .round-label"))).toEqual(["1", "2"]);
    });

    it("shows the Start row once somebody has a starting score", async () => {
      const user = userEvent.setup();
      const { container } = renderApp();

      // Go back to round 0 (the initial scores) and give the first player a score
      fireEvent.keyDown(window, { key: "ArrowLeft" });
      fireEvent.keyDown(window, { key: "7" });
      fireEvent.keyDown(window, { key: "Enter" });
      await user.click(container.querySelectorAll(".buttons-section button")[2]!);

      expect(texts(container.querySelectorAll("tbody .round-label"))).toEqual(["Start"]);
      expect(texts(container.querySelectorAll(".start-row .score-cell"))).toEqual(["7"]);
    });

    it("marks negative scores and colors each header with its player's color", async () => {
      const { container } = await playTwoRounds();

      expect(texts(container.querySelectorAll(".score-cell.negative"))).toEqual(["-2"]);
      const headers = container.querySelectorAll<HTMLElement>(".player-header");
      expect(headers[0]!.style.borderBottomColor).not.toBe(headers[1]!.style.borderBottomColor);
    });

    it("jumps to a score on the keypad when its cell is clicked", async () => {
      const { user, container } = await playTwoRounds();

      await user.click(container.querySelectorAll("tbody tr:nth-child(1) .score-cell")[1]!);

      expect(container.querySelector(".keypad")).not.toBeNull();
      expect(container.querySelector(".round-label")!.textContent).toBe("Round 1");
      expect(container.querySelector(".player.selected")!.textContent).toContain("Player 2");
    });

    it("says so when there are no players", async () => {
      const user = userEvent.setup();
      const { container } = renderApp();
      await user.click(container.querySelector(".button-edit")!);
      await user.click(container.querySelector(".delete-button")!);
      await user.click(container.querySelector(".button-edit")!);
      await user.click(container.querySelectorAll(".buttons-section button")[2]!);

      expect(screen.getByText("No players")).toBeTruthy();
    });
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
