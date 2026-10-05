import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { createDemoGame } from "@/demoGame";
import { lastRound, totalScore, totalScoreRange } from "@/utils/Scores";

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

    const demo = createDemoGame();
    expect(container.querySelectorAll(".player")).toHaveLength(demo.scorecards.length);
    expect(container.querySelector(".round-label")!.textContent).toBe(`Round ${lastRound(demo)}`);
    expect(shownScores(container)).toEqual(
      demo.scorecards.map((card) => String(card.scores.at(-1))),
    );
  });

  it("shows the whole game in the score table", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/?demo");

    await user.click(screen.getByText("Continue Game"));
    await user.click(container.querySelectorAll(".buttons-section button")[2]!);

    const demo = createDemoGame();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(lastRound(demo)); // No Start row: all zeros
    expect(
      Array.from(container.querySelectorAll(".total-cell")).map((el) => el.textContent),
    ).toEqual(demo.scorecards.map((card) => String(totalScore(card))));
  });

  it("keeps the story: Priya wins easily, Hendrik and Sam follow, and Alida finishes last", () => {
    const demo = createDemoGame();
    const total = (name: string) =>
      totalScore(demo.scorecards.find((card) => card.playerName === name)!);
    const others = demo.scorecards.map(totalScore).sort((x, y) => y - x);

    expect(total("Priya")).toBe(others[0]);
    expect(total("Priya") - others[1]!).toBeGreaterThan(30);
    expect(total("Priya")).toBeGreaterThan(total("Hendrik") + 60);
    expect(total("Hendrik")).toBeGreaterThan(total("Sam") + 60);
    expect(total("Sam")).toBeGreaterThan(total("Alida") + 60);
    expect(total("Alida")).toBe(others.at(-1));
  });

  it("is very random from round to round, and the weakest player dips below zero", () => {
    const demo = createDemoGame();
    for (const card of demo.scorecards) {
      const rounds = card.scores.slice(1);
      expect(Math.max(...rounds) - Math.min(...rounds)).toBeGreaterThan(30);
    }
    expect(demo.scorecards.some((card) => card.scores.slice(1).some((score) => score < 0))).toBe(
      true,
    );
    expect(totalScoreRange(demo).min).toBeLessThan(0);
  });

  it("has enough players, with their own colors, that the score table scrolls sideways", () => {
    const demo = createDemoGame();
    expect(demo.scorecards).toHaveLength(12);
    expect(new Set(demo.scorecards.map((card) => card.color)).size).toBe(12);
    expect(new Set(demo.scorecards.map((card) => card.playerName)).size).toBe(12);
  });

  it("is the same every time", () => {
    const scores = () => createDemoGame().scorecards.map((card) => card.scores);
    expect(scores()).toEqual(scores());
  });

  it("is long enough for the score table to need scrolling", () => {
    expect(lastRound(createDemoGame())).toBeGreaterThan(15);
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

  describe("plot", () => {
    /** Type in one score per player (e.g. "5" or "-2") and move on to the next round */
    function playRound(...scores: string[]) {
      for (const score of scores) {
        for (const key of score) fireEvent.keyDown(window, { key });
        fireEvent.keyDown(window, { key: "Enter" });
      }
      fireEvent.keyDown(window, { key: "ArrowRight" });
    }

    async function openPlot(container: HTMLElement) {
      await userEvent.setup().click(container.querySelectorAll(".buttons-section button")[1]!);
    }

    const labels = (container: HTMLElement, axis: "x" | "y") =>
      Array.from(container.querySelectorAll(`.plot-label-${axis}`)).map((el) => el.textContent);

    it("explains that there is nothing to plot yet", async () => {
      const { container } = renderApp();
      await openPlot(container);

      expect(screen.getByText("Nothing to plot yet")).toBeTruthy();
      expect(container.querySelector(".plot-line")).toBeNull();
    });

    it("draws a line with an end dot for every player", async () => {
      const user = userEvent.setup();
      const { container } = renderApp();
      await addSecondPlayer(user, container);
      playRound("5", "3");
      playRound("-2", "4");
      await openPlot(container);

      expect(screen.queryByText("Nothing to plot yet")).toBeNull();
      const lines = container.querySelectorAll(".plot-line");
      expect(lines).toHaveLength(2);
      // One point for the starting scores and one for each round
      expect(lines[0]!.getAttribute("points")!.split(" ")).toHaveLength(3);
      expect(container.querySelectorAll(".plot-end-dot")).toHaveLength(2);
    });

    it("labels the rounds and the scores", async () => {
      const user = userEvent.setup();
      const { container } = renderApp();
      await addSecondPlayer(user, container);
      playRound("5", "3");
      playRound("-2", "4"); // Totals end up as 3 and 7
      await openPlot(container);

      expect(labels(container, "x")).toEqual(["0", "1", "2"]);
      expect(labels(container, "y")).toContain("0");
      expect(labels(container, "y")).toContain("7");
      expect(container.querySelectorAll(".plot-gridline").length).toBeGreaterThan(0);
    });

    it("labels negative scores too", async () => {
      const { container } = renderApp();
      playRound("-5");
      playRound("-3");
      await openPlot(container);

      expect(labels(container, "y")).toContain("-8");
      expect(labels(container, "y")).toContain("0");
    });

    // The test canvas is 800 wide and the plot spans x = 48 (round 0) to x = 776 (the last round)
    const plotLeft = 48;
    const plotRight = 776;
    const plotBottom = 570; // The test canvas is 600 high, with 30 left below the plot for labels

    async function twoPlayersTwoRounds() {
      const user = userEvent.setup();
      const view = renderApp();
      await addSecondPlayer(user, view.container);
      playRound("5", "3");
      playRound("-2", "4"); // After round 2: Player 1 has 3 (-2), Player 2 has 7 (+4)
      await openPlot(view.container);
      return { user, plotArea: view.container.querySelector(".plot-area")!, ...view };
    }

    const readoutRows = (container: HTMLElement) =>
      Array.from(container.querySelectorAll(".plot-readout-row")).map((row) => row.textContent);

    it("keeps the ends of the axes clear of the zero labels", async () => {
      const { container } = await twoPlayersTwoRounds();
      const [zeroLine, yAxis] = Array.from(container.querySelectorAll(".plot-axis"));

      // Neither axis pokes out past the point where they meet, where the "0" labels are
      expect(Number(zeroLine!.getAttribute("x1"))).toBe(plotLeft);
      expect(Number(yAxis!.getAttribute("y2"))).toBe(plotBottom);
      const labelBottom = Number(container.querySelector(".plot-label-x")!.getAttribute("y"));
      expect(labelBottom - Number(yAxis!.getAttribute("y2"))).toBeGreaterThanOrEqual(20);
      const yLabelX = Number(container.querySelector(".plot-label-y")!.getAttribute("x"));
      expect(Number(yAxis!.getAttribute("x1")) - yLabelX).toBeGreaterThanOrEqual(10);
    });

    describe("hovering", () => {
      it("shows nothing until the mouse is over the plot", async () => {
        const { container } = await twoPlayersTwoRounds();
        expect(container.querySelector(".plot-readout")).toBeNull();
        expect(container.querySelector(".plot-guide")).toBeNull();
      });

      it("shows everybody's total after the round, best first", async () => {
        const { container, plotArea } = await twoPlayersTwoRounds();

        fireEvent.pointerMove(plotArea, { clientX: plotRight });

        expect(container.querySelector(".plot-readout-title")!.textContent).toBe("Round 2");
        expect(readoutRows(container)).toEqual(["Player 27+4", "Player 13-2"]);
        expect(container.querySelector(".plot-guide")).not.toBeNull();
        expect(container.querySelectorAll(".plot-hover-dot")).toHaveLength(2);
      });

      it("snaps to the nearest round", async () => {
        const { container, plotArea } = await twoPlayersTwoRounds();
        const title = () => container.querySelector(".plot-readout-title")!.textContent;
        const roundWidth = (plotRight - plotLeft) / 2;

        fireEvent.pointerMove(plotArea, { clientX: plotLeft + roundWidth * 0.4 });
        expect(title()).toBe("Start");
        fireEvent.pointerMove(plotArea, { clientX: plotLeft + roundWidth * 0.6 });
        expect(title()).toBe("Round 1");
        fireEvent.pointerMove(plotArea, { clientX: plotLeft + roundWidth * 5 }); // Way past the end
        expect(title()).toBe("Round 2");
        fireEvent.pointerMove(plotArea, { clientX: -100 }); // Way before the start
        expect(title()).toBe("Start");
      });

      it("only shows round totals, not gains, for the start", async () => {
        const { container, plotArea } = await twoPlayersTwoRounds();
        fireEvent.pointerMove(plotArea, { clientX: plotLeft });
        expect(readoutRows(container)).toEqual(["Player 10", "Player 20"]);
      });

      it("goes away when the mouse leaves", async () => {
        const { container, plotArea } = await twoPlayersTwoRounds();
        fireEvent.pointerMove(plotArea, { clientX: plotRight });
        expect(container.querySelector(".plot-readout")).not.toBeNull();

        fireEvent.pointerLeave(plotArea, { pointerType: "mouse" });
        expect(container.querySelector(".plot-readout")).toBeNull();
        expect(container.querySelector(".plot-guide")).toBeNull();
      });

      it("stays when a finger is lifted, so it can be read", async () => {
        const { container, plotArea } = await twoPlayersTwoRounds();
        fireEvent.pointerDown(plotArea, { clientX: plotRight, pointerType: "touch" });
        fireEvent.pointerLeave(plotArea, { pointerType: "touch" });
        expect(container.querySelector(".plot-readout")).not.toBeNull();
      });

      it("does nothing when there is nothing to plot", async () => {
        const { container } = renderApp();
        await openPlot(container);
        fireEvent.pointerMove(container.querySelector(".plot-area")!, { clientX: plotRight });
        expect(container.querySelector(".plot-readout")).toBeNull();
      });
    });

    describe("highlighting a player from the list", () => {
      const lineStates = (container: HTMLElement) =>
        Array.from(container.querySelectorAll(".plot-player")).map((line) => ({
          highlighted: line.classList.contains("highlighted"),
          classes: line.getAttribute("class"),
        }));

      it("makes that player's line bolder and leaves the other lines alone", async () => {
        const { user, container } = await twoPlayersTwoRounds();
        expect(lineStates(container).some((s) => s.highlighted)).toBe(false);

        await user.hover(container.querySelectorAll(".player")[1]!);

        const states = lineStates(container);
        expect(states.filter((s) => s.highlighted)).toHaveLength(1);
        // The other line has no extra classes, so nothing fades it
        expect(states.filter((s) => !s.highlighted).map((s) => s.classes)).toEqual(["plot-player"]);
        expect(container.querySelector(".dimmed")).toBeNull();
      });

      it("draws the highlighted line last, on top", async () => {
        const { user, container } = await twoPlayersTwoRounds();
        await user.hover(container.querySelectorAll(".player")[0]!);

        const players = container.querySelectorAll(".plot-player");
        expect(players[players.length - 1]!.classList.contains("highlighted")).toBe(true);
      });

      it("goes back to normal when the mouse leaves the player", async () => {
        const { user, container } = await twoPlayersTwoRounds();
        await user.hover(container.querySelectorAll(".player")[1]!);
        await user.unhover(container.querySelectorAll(".player")[1]!);

        expect(lineStates(container).some((s) => s.highlighted)).toBe(false);
      });

      it("is also shown in the hover readout", async () => {
        const { user, container, plotArea } = await twoPlayersTwoRounds();
        fireEvent.pointerMove(plotArea, { clientX: plotRight });
        await user.hover(container.querySelectorAll(".player")[0]!);

        expect(container.querySelectorAll(".plot-readout-row.highlighted")).toHaveLength(1);
        expect(container.querySelector(".plot-readout-row.highlighted")!.textContent).toContain(
          "Player 1",
        );
      });
    });

    it("describes itself to screen readers", async () => {
      const { container } = renderApp();
      playRound("4");
      await openPlot(container);

      expect(screen.getByRole("img", { name: /line chart/i })).toBeTruthy();
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
