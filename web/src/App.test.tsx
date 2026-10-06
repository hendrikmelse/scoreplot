import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { defaultColors } from "@/config";
import { createDemoGame } from "@/demoGame";
import { DEFAULT_GAME_NAME } from "@/Game";
import { lastRound, partialScores, totalScore, totalScoreRange } from "@/utils/Scores";

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
  await user.click(container.querySelector(".edit-players-button")!);
  await user.click(container.querySelector(".add-player-button")!);
  await user.click(container.querySelector(".done-button")!);
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

  it("keeps the story: Hendrik wins easily, Priya and Sam follow, and Alida finishes last", () => {
    const demo = createDemoGame();
    const total = (name: string) =>
      totalScore(demo.scorecards.find((card) => card.playerName === name)!);
    const ranked = demo.scorecards.map(totalScore).sort((x, y) => y - x);

    expect(total("Hendrik")).toBe(ranked[0]);
    expect(total("Hendrik") - ranked[1]!).toBeGreaterThan(60);
    expect(total("Priya")).toBeGreaterThan(total("Sam") + 60);
    expect(total("Sam")).toBeGreaterThan(total("Alida") + 60);
    expect(total("Alida")).toBe(ranked.at(-1));
  });

  it("has Alida dip below zero along the way", () => {
    const alida = createDemoGame().scorecards.find((card) => card.playerName === "Alida")!;
    expect(Math.min(...partialScores(alida))).toBeLessThan(-10);
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

  it("has so many players that the player list and the score table have to scroll", () => {
    const demo = createDemoGame();
    expect(demo.scorecards).toHaveLength(20);
    expect(new Set(demo.scorecards.map((card) => card.color)).size).toBe(20);
    expect(new Set(demo.scorecards.map((card) => card.playerName)).size).toBe(20);
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

    await user.click(container.querySelector(".done-button, .edit-players-button")!);

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

  it("has nothing to continue until a game has been started", () => {
    renderApp("/");
    expect(screen.queryByRole("button", { name: /Continue Game/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Start New Game" })).toBeTruthy();
  });

  it("always has Start New Game as the main button, with Continue Game as the other", () => {
    const { unmount } = renderApp("/");
    expect(screen.getByRole("button", { name: "Start New Game" }).classList).toContain("primary");
    unmount();

    const demo = renderApp("/?demo");
    expect(screen.getByRole("button", { name: "Start New Game" }).classList).toContain("primary");
    const continueButton = screen.getByRole("button", { name: /Continue Game/ });
    expect(continueButton.classList).not.toContain("primary");
    expect(continueButton.textContent).toContain("Friday Night Rummy");
    expect(continueButton.textContent).toContain(`${createDemoGame().scorecards.length} players`);
    expect(demo.container.querySelectorAll(".score-lines-backdrop polyline")).toHaveLength(5);
  });

  it("continues the current game outside of edit mode", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/");

    await user.click(screen.getByText("Start New Game"));
    await user.click(container.querySelector(".button-home")!);
    await user.click(screen.getByText("Continue Game"));

    expect(container.querySelector(".game-play-background")).not.toBeNull();
    expect(container.querySelector(".player.editing")).toBeNull();
    expect(screen.queryByText("Edit Players")).toBeNull();
  });
});

describe("game play page", () => {
  it("renders the player and the game name", () => {
    renderApp();
    expect(screen.getByText("New Game (click to edit)")).toBeTruthy();
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

    await user.click(container.querySelector(".done-button, .edit-players-button")!);
    await user.click(container.querySelector(".add-player-button")!);

    const input = document.activeElement as HTMLInputElement;
    expect(input.className).toBe("player-name-input");
    expect(input.value).toBe("Player 2");
  });

  it("shows player names as plain text normally and as text boxes in edit mode", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    expect(container.querySelector(".player-name-input")).toBeNull();

    await user.click(container.querySelector(".done-button, .edit-players-button")!);
    expect(container.querySelector<HTMLInputElement>(".player-name-input")!.value).toBe("Player 1");
    // The game name is not part of edit mode
    expect(container.querySelector(".game-name-input")).toBeNull();

    await user.click(container.querySelector(".done-button, .edit-players-button")!);
    expect(container.querySelector(".player-name-input")).toBeNull();
  });

  it("renames the game by pressing its name, whether or not players are being edited", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    await user.click(container.querySelector(".game-name-label")!);
    const input = container.querySelector<HTMLInputElement>(".game-name-input")!;
    expect(input.value).toBe("New Game (click to edit)");
    expect(container.querySelector(".player-name-input")).toBeNull(); // Not editing the players

    await user.clear(input);
    await user.type(input, "Rummy{Enter}");
    expect(container.querySelector(".game-name-input")).toBeNull();
    expect(screen.getByText("Rummy")).toBeTruthy();
  });

  it("renames the game and players from their text boxes", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    await user.click(container.querySelector(".game-name-label")!);
    await user.clear(container.querySelector(".game-name-input")!);
    await user.type(container.querySelector(".game-name-input")!, "Rummy{Enter}");
    await user.click(container.querySelector(".edit-players-button")!);
    await user.clear(container.querySelector(".player-name-input")!);
    await user.type(container.querySelector(".player-name-input")!, "Ada{Enter}");
    await user.click(container.querySelector(".done-button")!);

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

  describe("keypad", () => {
    const key = (container: HTMLElement, name: string) =>
      container.querySelector<HTMLElement>(`.key-${name}`)!;

    it("shows the score in a plain element, not an input a touchscreen could focus", () => {
      const { container } = renderApp();
      const display = container.querySelector(".score-display")!;

      expect(display.tagName).toBe("DIV");
      expect(display.getAttribute("role")).toBe("status");
      expect(container.querySelector(".keypad input")).toBeNull();
    });

    it("has every key, with the icon keys named for screen readers", () => {
      const { container } = renderApp();

      expect(container.querySelectorAll(".keypad .key")).toHaveLength(14);
      expect(screen.getByRole("button", { name: "Backspace" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Submit score" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "7" })).toBeTruthy();
    });

    it("types and submits when the keys are tapped", async () => {
      const user = userEvent.setup();
      const { container } = renderApp();
      const display = () => container.querySelector(".score-value")!.textContent;

      await user.click(key(container, "1"));
      await user.click(key(container, "2"));
      await user.click(key(container, "negate"));
      expect(display()).toBe("-12");

      await user.click(key(container, "backspace"));
      expect(display()).toBe("-1");

      await user.click(key(container, "enter"));
      expect(display()).toBe("0");
      expect(shownScores(container)[0]).toBe("-1");
    });

    it("shows a key as pressed until the finger lets go, and for long enough to be seen", () => {
      vi.useFakeTimers();
      try {
        const { container } = renderApp();
        const five = key(container, "5");

        expect(five.classList.contains("pressed")).toBe(false);
        fireEvent.pointerDown(five);
        expect(five.classList.contains("pressed")).toBe(true);
        fireEvent.pointerUp(five); // A quick tap: it stays pressed a moment longer
        expect(five.classList.contains("pressed")).toBe(true);
        act(() => vi.advanceTimersByTime(200));
        expect(five.classList.contains("pressed")).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it("stops looking pressed when the finger slides off or the touch is cancelled", () => {
      vi.useFakeTimers();
      try {
        const { container } = renderApp();
        const five = key(container, "5");

        fireEvent.pointerDown(five);
        fireEvent.pointerLeave(five);
        act(() => vi.advanceTimersByTime(200));
        expect(five.classList.contains("pressed")).toBe(false);

        fireEvent.pointerDown(five);
        fireEvent.pointerCancel(five);
        act(() => vi.advanceTimersByTime(200));
        expect(five.classList.contains("pressed")).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it("counts a touch the moment the finger goes down, even if it drifts off the key", () => {
      const { container } = renderApp();
      const display = () => container.querySelector(".score-value")!.textContent;

      fireEvent.pointerDown(key(container, "5"), { pointerType: "touch" });
      expect(display()).toBe("5");
      fireEvent.pointerLeave(key(container, "5"), { pointerType: "touch" }); // No click follows
      expect(display()).toBe("5");
    });

    it("does not count a touch twice when the click follows", () => {
      const { container } = renderApp();
      const five = key(container, "5");

      fireEvent.pointerDown(five, { pointerType: "touch" });
      fireEvent.pointerUp(five, { pointerType: "touch" });
      fireEvent.click(five, { detail: 1 });

      expect(container.querySelector(".score-value")!.textContent).toBe("5");
    });

    it("still counts a key pressed with the keyboard after a touch", () => {
      const { container } = renderApp();
      const five = key(container, "5");

      fireEvent.pointerDown(five, { pointerType: "touch" });
      fireEvent.click(five, { detail: 1 });
      fireEvent.click(five, { detail: 0 });

      expect(container.querySelector(".score-value")!.textContent).toBe("55");
    });

    it("only ever shows one key as pressed", () => {
      const { container } = renderApp();

      fireEvent.pointerDown(key(container, "1"));
      fireEvent.pointerDown(key(container, "2"));

      expect(container.querySelectorAll(".key.pressed")).toHaveLength(1);
      expect(key(container, "2").classList.contains("pressed")).toBe(true);
    });

    it("does not enter anything when a mouse press is cancelled before the click completes", () => {
      const { container } = renderApp();

      fireEvent.pointerDown(key(container, "8"), { pointerType: "mouse" });
      fireEvent.pointerCancel(key(container, "8"), { pointerType: "mouse" }); // No click follows

      expect(container.querySelector(".score-value")!.textContent).toBe("0");
    });
  });

  describe("player list", () => {
    afterEach(() => {
      // jsdom doesn't implement scrollIntoView, so these tests add (and then remove) a fake
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    });

    function spyOnScrollIntoView() {
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      return scrollIntoView;
    }

    it("keeps the add player button outside the scrolling list, so it's always reachable", async () => {
      const user = userEvent.setup();
      const { container } = renderApp();
      await user.click(container.querySelector(".edit-players-button")!);
      const list = container.querySelector(".player-list")!;
      const footer = container.querySelector(".list-footer")!;

      expect(footer.querySelector(".add-player-button")).not.toBeNull();
      expect(list.contains(footer)).toBe(false);
      expect(footer.parentElement).toBe(list.parentElement);
      expect(container.querySelector(".round-buttons")!.parentElement).toBe(list.parentElement);
    });

    it("scrolls the next player into view when the keypad moves on to them", async () => {
      const user = userEvent.setup();
      const { container } = renderApp();
      await addSecondPlayer(user, container);
      const scrollIntoView = spyOnScrollIntoView();

      fireEvent.keyDown(window, { key: "ArrowDown" });

      const rows = container.querySelectorAll(".player");
      const lastCall = scrollIntoView.mock.contexts.length - 1;
      expect(scrollIntoView.mock.contexts[lastCall]).toBe(rows[1]);
      expect(scrollIntoView.mock.calls[lastCall]).toEqual([{ block: "nearest" }]);
    });

    it("scrolls to the player entered on, after a score moves the selection along", async () => {
      const user = userEvent.setup();
      const { container } = renderApp();
      await addSecondPlayer(user, container);
      const scrollIntoView = spyOnScrollIntoView();

      // Player 1 scores, so Player 2 is selected next
      fireEvent.keyDown(window, { key: "4" });
      fireEvent.keyDown(window, { key: "Enter" });
      const rows = container.querySelectorAll(".player");
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(rows[1]);
    });

    it("doesn't scroll around in edit mode", async () => {
      const user = userEvent.setup();
      const { container } = renderApp();
      await user.click(container.querySelector(".done-button, .edit-players-button")!);
      const scrollIntoView = spyOnScrollIntoView();

      fireEvent.keyDown(window, { key: "ArrowDown" });
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    describe("dragging a player to reorder", () => {
      const rowHeight = 44; // Distance from one row to the next
      const listTop = 100;
      const listBottom = 500; // So the edges, where autoscroll starts, are 100-156 and 444-500

      let scrollTop = 0;

      beforeEach(() => {
        vi.useFakeTimers();
        scrollTop = 0;
      });
      afterEach(() => {
        vi.useRealTimers();
      });

      const rect = (top: number, height: number) =>
        ({
          x: 0,
          y: top,
          left: 0,
          top,
          right: 400,
          bottom: top + height,
          width: 400,
          height,
        }) as DOMRect;

      /** The demo game in edit mode, with the list and its rows laid out as the test describes */
      function openLongList() {
        const view = renderApp("/?demo");
        fireEvent.click(screen.getByText("Continue Game"));
        fireEvent.click(view.container.querySelector(".done-button, .edit-players-button")!);

        const list = view.container.querySelector<HTMLElement>(".player-list")!;
        list.getBoundingClientRect = () => rect(listTop, listBottom - listTop);
        // jsdom doesn't scroll, so keep track of how far the list has been scrolled
        Object.defineProperty(list, "scrollTop", {
          get: () => scrollTop,
          set: (value: number) => {
            scrollTop = value;
            list.dispatchEvent(new Event("scroll"));
          },
        });
        const rows = () => Array.from(view.container.querySelectorAll<HTMLElement>(".player"));
        for (const row of rows()) {
          row.getBoundingClientRect = () => rect(rows().indexOf(row) * rowHeight, rowHeight - 4);
        }
        return view;
      }

      const names = (container: HTMLElement) =>
        Array.from(container.querySelectorAll<HTMLInputElement>(".player-name-input")).map(
          (input) => input.value,
        );

      /** Press on a player's drag handle, with the pointer at the given height on the screen */
      function grab(container: HTMLElement, index: number, clientY: number) {
        const handle = container.querySelectorAll(".drag-handle")[index]!;
        fireEvent.pointerDown(handle, { clientY });
      }

      const holdFor = (ms: number) => act(() => vi.advanceTimersByTime(ms));
      const movePointerTo = (clientY: number) => fireEvent.pointerMove(window, { clientY });

      it("scrolls the list when a player is dragged to the bottom edge", () => {
        const { container } = openLongList();
        grab(container, 0, 300);
        movePointerTo(listBottom - 10);

        holdFor(500);
        expect(scrollTop).toBeGreaterThan(100);
      });

      it("scrolls the list up when a player is dragged to the top edge", () => {
        const { container } = openLongList();
        scrollTop = 600;
        grab(container, 10, 300);
        movePointerTo(listTop + 10);

        holdFor(500);
        expect(scrollTop).toBeLessThan(500);
      });

      it("doesn't scroll while the player is in the middle of the list", () => {
        const { container } = openLongList();
        grab(container, 0, 300);
        movePointerTo(320);

        holdFor(1000);
        expect(scrollTop).toBe(0);
      });

      it("doesn't scroll at all when nobody is being dragged", () => {
        openLongList();
        holdFor(1000);
        expect(scrollTop).toBe(0);
      });

      it("keeps scrolling, and faster, with the pointer past the end of the list", () => {
        const first = openLongList();
        grab(first.container, 0, 300);
        movePointerTo(listBottom - 30);
        holdFor(300);
        const nearTheEdge = scrollTop;
        first.unmount();

        scrollTop = 0;
        const second = openLongList();
        grab(second.container, 0, 300);
        movePointerTo(listBottom + 80); // Well below the list
        holdFor(300);

        expect(nearTheEdge).toBeGreaterThan(0);
        expect(scrollTop).toBeGreaterThan(nearTheEdge);
      });

      it("stops scrolling when the player is let go of", () => {
        const { container } = openLongList();
        grab(container, 0, 300);
        movePointerTo(listBottom - 10);
        holdFor(200);
        fireEvent.pointerUp(window);

        const where = scrollTop;
        holdFor(1000);
        expect(scrollTop).toBe(where);
      });

      it("stops scrolling when the touch is cancelled too", () => {
        const { container } = openLongList();
        grab(container, 0, 300);
        movePointerTo(listBottom - 10);
        holdFor(200);
        fireEvent.pointerCancel(window);

        const where = scrollTop;
        holdFor(1000);
        expect(scrollTop).toBe(where);
      });

      it("moves the player down the list as it scrolls past, with the pointer standing still", () => {
        const { container } = openLongList();
        const before = names(container);
        grab(container, 0, 300);
        movePointerTo(listBottom - 10);

        holdFor(3000); // Long enough to scroll the whole way

        const after = names(container);
        expect(after.at(-1)).toBe(before[0]);
        // Everybody else just shuffled up one place each
        expect(after.slice(0, -1)).toEqual(before.slice(1));
      });

      it("moves the player up the list when dragged to the top edge", () => {
        const { container } = openLongList();
        const before = names(container);
        scrollTop = 800;
        grab(container, 19, 300);
        movePointerTo(listTop + 5);

        holdFor(3000);

        const after = names(container);
        expect(after[0]).toBe(before.at(-1));
        expect(after.slice(1)).toEqual(before.slice(0, -1));
      });

      it("still follows the pointer when the pointer has left the list", () => {
        const { container } = openLongList();
        grab(container, 0, 300);
        // The pointer is moved on the window, not the list, so this only works if that's listened to
        movePointerTo(300 + rowHeight); // A player changes place by one row for each move
        movePointerTo(300 + rowHeight * 2);
        holdFor(50);

        expect(names(container).indexOf("Alida")).toBe(2);
      });
    });

    describe("color picker", () => {
      // jsdom has no layout, so put the player's color swatch where the test wants it on the screen
      async function openPickerWithSwatchAt(y: number) {
        const user = userEvent.setup();
        const view = renderApp();
        await user.click(view.container.querySelector(".done-button, .edit-players-button")!);
        const swatch = view.container.querySelector<HTMLElement>(".player-color")!;
        swatch.getBoundingClientRect = () =>
          ({
            x: 40,
            y,
            left: 40,
            top: y,
            right: 80,
            bottom: y + 40,
            width: 40,
            height: 40,
          }) as DOMRect;
        await user.click(swatch);
        return view.container.querySelector<HTMLElement>(".color-select-content")!;
      }

      beforeEach(() => {
        Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
      });

      it("sits next to the color it is for", async () => {
        const picker = await openPickerWithSwatchAt(300);
        expect(picker.style.top).toBe("265px");
      });

      it("stays on the screen when the color is near the bottom", async () => {
        const picker = await openPickerWithSwatchAt(780);
        expect(picker.style.top).toBe("686px"); // 800 high, minus the picker's 102 and a 12 margin
      });

      it("stays on the screen when the color is near the top", async () => {
        const picker = await openPickerWithSwatchAt(5);
        expect(picker.style.top).toBe("12px");
      });
    });
  });

  it("does not type into the keypad while renaming a player", async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    await user.click(container.querySelector(".done-button, .edit-players-button")!);
    await user.click(container.querySelector(".player-name-input")!);
    await user.keyboard("7{Enter}");

    expect(container.querySelector(".score-value")!.textContent).toBe("0");
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

    describe("editing a score", () => {
      const cellButton = (container: HTMLElement, row: number, player: number) =>
        container.querySelectorAll<HTMLElement>(
          `tbody tr:nth-child(${row}) .score-cell .score-button`,
        )[player]!;
      const totals = (container: HTMLElement) =>
        Array.from(container.querySelectorAll(".total-cell")).map((cell) => cell.textContent);
      const savedScores = () =>
        JSON.parse(localStorage.getItem("scoreplot.game")!).game.scorecards.map(
          (card: { scores: number[] }) => card.scores,
        );

      it("changes the score in the table, and the totals with it", async () => {
        const { user, container } = await playTwoRounds(); // Totals 3 and 7

        await user.click(cellButton(container, 1, 1)); // Player 2's score in round 1, which is 3
        await user.keyboard("10{Enter}");

        expect(texts(container.querySelectorAll("tbody tr:nth-child(1) .score-cell"))).toEqual([
          "5",
          "10",
        ]);
        expect(totals(container)).toEqual(["3", "14"]);
      });

      it("is saved with the game", async () => {
        const { user, container } = await playTwoRounds();

        await user.click(cellButton(container, 2, 0)); // Player 1's score in round 2, which is -2
        await user.keyboard("8{Enter}");

        expect(savedScores()[0]).toEqual([0, 5, 8]);
      });

      it("changes the totals in the player list too", async () => {
        const { user, container } = await playTwoRounds();

        await user.click(cellButton(container, 1, 0));
        await user.keyboard("20{Enter}");
        await user.click(screen.getByRole("tab", { name: "Keypad" }));
        await user.click(screen.getByRole("tab", { name: "Plot" })); // Shows the totals again

        expect(shownScores(container)).toEqual(["18", "7"]);
      });

      it("stays on the table, and does not go to the keypad", async () => {
        const { user, container } = await playTwoRounds();

        await user.click(cellButton(container, 1, 1));

        expect(container.querySelector(".keypad")).toBeNull();
        expect(container.querySelector(".score-table-content")).not.toBeNull();
      });

      it("leaves the score alone when Escape is pressed", async () => {
        const { user, container } = await playTwoRounds();

        await user.click(cellButton(container, 1, 1));
        await user.keyboard("99{Escape}");

        expect(totals(container)).toEqual(["3", "7"]);
        expect(savedScores()[1]).toEqual([0, 3, 4]);
      });

      it("says how", async () => {
        await playTwoRounds();
        expect(screen.getByText("Tap a score to edit it")).toBeTruthy();
      });
    });

    it("says so when there are no players", async () => {
      const user = userEvent.setup();
      const { container } = renderApp();
      await user.click(container.querySelector(".done-button, .edit-players-button")!);
      await user.click(container.querySelector(".delete-button")!);
      await user.click(container.querySelector(".done-button, .edit-players-button")!);
      await user.click(container.querySelectorAll(".buttons-section button")[2]!);

      // The player list says something of its own, so look at the table's
      const empty = container.querySelector(".score-table-empty")!;
      expect(empty.textContent).toContain("No players yet");
      expect(empty.textContent).toContain("Add some from the player list");
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

      it("goes away when a finger taps outside the plot", async () => {
        const { container, plotArea } = await twoPlayersTwoRounds();
        fireEvent.pointerDown(plotArea, { clientX: plotRight, pointerType: "touch" });
        expect(container.querySelector(".plot-readout")).not.toBeNull();

        fireEvent.pointerDown(container.querySelector(".player")!, { pointerType: "touch" });
        expect(container.querySelector(".plot-readout")).toBeNull();
        expect(container.querySelector(".plot-guide")).toBeNull();
      });

      it("stays when a finger taps inside the plot again", async () => {
        const { container, plotArea } = await twoPlayersTwoRounds();
        fireEvent.pointerDown(plotArea, { clientX: plotRight, pointerType: "touch" });
        fireEvent.pointerDown(plotArea, { clientX: plotLeft, pointerType: "touch" });
        expect(container.querySelector(".plot-readout-title")!.textContent).toBe("Start");
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

      it("makes that player's line bolder, and lets the other lines step back", async () => {
        const { user, container } = await twoPlayersTwoRounds();
        expect(lineStates(container).some((s) => s.highlighted)).toBe(false);

        await user.hover(container.querySelectorAll(".player")[1]!);

        const states = lineStates(container);
        expect(states.filter((s) => s.highlighted)).toHaveLength(1);
        // The other line is dimmed, and the highlighted one is not
        expect(states.filter((s) => !s.highlighted).map((s) => s.classes)).toEqual([
          "plot-player dimmed",
        ]);
        expect(states.find((s) => s.highlighted)!.classes).toBe("plot-player highlighted");
      });

      it("does not dim anything while nobody is picked out", async () => {
        const { container } = await twoPlayersTwoRounds();
        expect(container.querySelector(".dimmed")).toBeNull();
      });

      it("stops dimming when the mouse leaves the player", async () => {
        const { user, container } = await twoPlayersTwoRounds();
        const player = container.querySelectorAll(".player")[1]!;

        await user.hover(player);
        expect(container.querySelectorAll(".plot-player.dimmed")).toHaveLength(1);
        await user.unhover(player);

        expect(container.querySelector(".dimmed")).toBeNull();
      });

      it("dims the dots on the other lines as well, while the plot is being pointed at", async () => {
        const { user, container } = await twoPlayersTwoRounds();
        fireEvent.pointerMove(container.querySelector(".plot-area")!, { clientX: 776 });

        await user.hover(container.querySelectorAll(".player")[1]!);

        const dots = Array.from(container.querySelectorAll(".plot-hover-dot"));
        expect(dots.filter((dot) => dot.classList.contains("dimmed"))).toHaveLength(1);
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

    await user.click(container.querySelector(".done-button, .edit-players-button")!);
    for (const button of Array.from(container.querySelectorAll(".delete-button"))) {
      await user.click(button);
    }
    await user.click(container.querySelector(".done-button, .edit-players-button")!);
    await user.click(container.querySelectorAll(".buttons-section button")[1]!);

    expect(container.querySelector(".plot-scores-content")).not.toBeNull();
  });
});

describe("saving the game", () => {
  const savedGame = () => JSON.parse(localStorage.getItem("scoreplot.game") ?? "null");
  const continueButton = () => screen.getByRole("button", { name: /Continue Game/ });

  it("does not save a game nobody has done anything to", () => {
    renderApp("/");
    renderApp("/play/");
    expect(localStorage.getItem("scoreplot.game")).toBeNull();
  });

  it("saves the game as it changes", () => {
    const { container } = renderApp("/play/");

    fireEvent.keyDown(window, { key: "7" });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(savedGame().version).toBe(1);
    expect(savedGame().game.scorecards[0].scores[1]).toBe(7);
    expect(shownScores(container)).toEqual(["7"]);
  });

  it("brings the game back after a reload, and Continue Game picks it up", async () => {
    const user = userEvent.setup();
    const first = renderApp("/play/");
    await user.click(first.container.querySelector(".game-name-label")!);
    await user.clear(first.container.querySelector(".game-name-input")!);
    await user.type(first.container.querySelector(".game-name-input")!, "Rummy");
    await user.keyboard("{Enter}");
    fireEvent.keyDown(window, { key: "9" });
    fireEvent.keyDown(window, { key: "Enter" });
    first.unmount(); // Closing the page

    const second = renderApp("/");
    expect(continueButton().hasAttribute("disabled")).toBe(false);
    expect(screen.getByText("Rummy")).toBeTruthy();
    await user.click(screen.getByText("Continue Game"));
    expect(shownScores(second.container)).toEqual(["9"]);
  });

  it("starts a new game over the saved one", async () => {
    const user = userEvent.setup();
    const first = renderApp("/play/");
    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "Enter" });
    first.unmount();

    const second = renderApp("/");
    await user.click(screen.getByText("Start New Game"));

    expect(savedGame().game.name).toBe(DEFAULT_GAME_NAME);
    expect(savedGame().game.scorecards[0].scores).toEqual([0]);
    expect(second.container.querySelectorAll(".player")).toHaveLength(1);
  });

  it("starts fresh when the saved game is damaged", () => {
    localStorage.setItem("scoreplot.game", "{not json");
    renderApp("/");
    expect(screen.queryByRole("button", { name: /Continue Game/ })).toBeNull();
  });

  describe("the demo game", () => {
    const realGame = {
      version: 1,
      game: {
        id: "real",
        name: "My Real Game",
        scorecards: [{ id: "p", playerName: "Me", color: "#e6194b", scores: [0, 3] }],
      },
    };

    it("is not read from or written to storage, so it can never replace a real game", async () => {
      const user = userEvent.setup();
      localStorage.setItem("scoreplot.game", JSON.stringify(realGame));
      const before = localStorage.getItem("scoreplot.game");

      const { container } = renderApp("/?demo");
      expect(screen.getByText("Friday Night Rummy")).toBeTruthy();
      expect(screen.queryByText("My Real Game")).toBeNull();

      // Play: the "?demo" has gone from the address by now, but it is still the demo game
      await user.click(screen.getByText("Continue Game"));
      fireEvent.keyDown(window, { key: "4" });
      fireEvent.keyDown(window, { key: "Enter" });
      await user.click(container.querySelector(".done-button, .edit-players-button")!);
      await user.click(container.querySelector(".add-player-button")!);

      expect(localStorage.getItem("scoreplot.game")).toBe(before);
    });

    it("does not leave anything in storage when there was nothing there", async () => {
      const user = userEvent.setup();
      renderApp("/?demo");
      await user.click(screen.getByText("Continue Game"));
      fireEvent.keyDown(window, { key: "4" });
      fireEvent.keyDown(window, { key: "Enter" });

      expect(localStorage.getItem("scoreplot.game")).toBeNull();
    });
  });
});

describe("undoing", () => {
  // The messages of the toasts that are staying, not the ones that are falling away
  const toastMessages = () =>
    Array.from(document.querySelectorAll(".toast:not(.leaving) .toast-message")).map(
      (el) => el.textContent,
    );
  const names = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLInputElement>(".player-name-input")).map(
      (input) => input.value,
    );

  describe("deleting a player", () => {
    /** A game with three players: Player 1 scored 4, Player 2 scored 5, and Player 3 scored 6 */
    async function threePlayers() {
      const user = userEvent.setup();
      const view = renderApp("/play/");
      await user.click(view.container.querySelector(".done-button, .edit-players-button")!);
      await user.click(view.container.querySelector(".add-player-button")!);
      await user.click(view.container.querySelector(".add-player-button")!);
      await user.click(view.container.querySelector(".done-button, .edit-players-button")!);
      for (const score of ["4", "5", "6"]) {
        fireEvent.keyDown(window, { key: score });
        fireEvent.keyDown(window, { key: "Enter" });
      }
      await user.click(view.container.querySelector(".done-button, .edit-players-button")!);
      return { user, ...view };
    }

    it("says so, with a way to undo it", async () => {
      const { user, container } = await threePlayers();

      await user.click(container.querySelectorAll(".delete-button")[1]!);

      expect(toastMessages()).toEqual(["Deleted Player 2"]);
      expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
      expect(names(container)).toEqual(["Player 1", "Player 3"]);
    });

    it("puts the player back in the same place, with their scores and color", async () => {
      const { user, container } = await threePlayers();
      const colorBefore =
        container.querySelectorAll<HTMLElement>(".player-color")[1]!.style.backgroundColor;

      await user.click(container.querySelectorAll(".delete-button")[1]!);
      await user.click(screen.getByRole("button", { name: "Undo" }));

      expect(names(container)).toEqual(["Player 1", "Player 2", "Player 3"]);
      expect(
        container.querySelectorAll<HTMLElement>(".player-color")[1]!.style.backgroundColor,
      ).toBe(colorBefore);
      await user.click(container.querySelector(".done-button, .edit-players-button")!);
      expect(shownScores(container)).toEqual(["4", "5", "6"]);
      expect(toastMessages()).toEqual([]);
    });

    it("can undo several deletions, one at a time", async () => {
      const { user, container } = await threePlayers();

      await user.click(container.querySelectorAll(".delete-button")[0]!); // Player 1
      await user.click(container.querySelectorAll(".delete-button")[0]!); // Player 2
      expect(toastMessages()).toEqual(["Deleted Player 1", "Deleted Player 2"]);

      await user.click(screen.getAllByRole("button", { name: "Undo" })[1]!); // Undo Player 2
      expect(names(container)).toEqual(["Player 2", "Player 3"]);
      expect(toastMessages()).toEqual(["Deleted Player 1"]);

      // The toast that was pressed is still falling away, so only the one that is staying
      await user.click(document.querySelector(".toast:not(.leaving) .toast-action")!); // Undo Player 1
      expect(names(container)).toEqual(["Player 1", "Player 2", "Player 3"]);
    });

    it("is saved, and so is the undoing", async () => {
      const { user, container } = await threePlayers();
      const saved = () =>
        JSON.parse(localStorage.getItem("scoreplot.game")!).game.scorecards.length;

      await user.click(container.querySelectorAll(".delete-button")[2]!);
      expect(saved()).toBe(2);
      await user.click(screen.getByRole("button", { name: "Undo" }));
      expect(saved()).toBe(3);
    });
  });

  describe("starting a new game", () => {
    /** The title page, after playing a game called Rummy in which Player 1 scored 8 */
    async function afterPlayingRummy() {
      const user = userEvent.setup();
      const first = renderApp("/play/");
      await user.click(first.container.querySelector(".game-name-label")!);
      await user.clear(first.container.querySelector(".game-name-input")!);
      await user.type(first.container.querySelector(".game-name-input")!, "Rummy");
      await user.keyboard("{Enter}");
      fireEvent.keyDown(window, { key: "8" });
      fireEvent.keyDown(window, { key: "Enter" });
      first.unmount();
      return { user, ...renderApp("/") };
    }

    it("says so, with a way to undo it, over the game that was started", async () => {
      const { user, container } = await afterPlayingRummy();

      await user.click(screen.getByText("Start New Game"));

      expect(toastMessages()).toEqual(["Started a new game"]);
      expect(container.querySelector(".game-play-background")).not.toBeNull();
      expect(container.querySelectorAll(".player")).toHaveLength(1);
      expect(shownScores(container)).toEqual(["0"]);
    });

    it("brings back the game that was there before", async () => {
      const { user, container } = await afterPlayingRummy();
      const savedName = () => JSON.parse(localStorage.getItem("scoreplot.game")!).game.name;

      await user.click(screen.getByText("Start New Game"));
      expect(savedName()).toBe(DEFAULT_GAME_NAME);
      await user.click(screen.getByRole("button", { name: "Undo" }));

      expect(savedName()).toBe("Rummy");
      await user.click(container.querySelector(".done-button, .edit-players-button")!); // Out of edit mode, as new games start in it
      expect(shownScores(container)).toEqual(["8"]);
      expect(container.querySelector(".game-name-label")!.textContent).toBe("Rummy");
    });

    it("does not bother when there was nothing to lose", async () => {
      const user = userEvent.setup();
      renderApp("/");
      await user.click(screen.getByText("Start New Game"));
      expect(toastMessages()).toEqual([]);
    });

    it("does not bother when the game had not been touched", async () => {
      const user = userEvent.setup();
      const { container } = renderApp("/");
      await user.click(screen.getByText("Start New Game")); // A game, but a blank one
      await user.click(container.querySelector(".button-home")!);
      await user.click(screen.getByText("Start New Game"));
      expect(toastMessages()).toEqual([]);
    });
  });
});

describe("pressing a toast while editing", () => {
  it("does not leave edit mode, so that you can go on editing after an Undo", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    await user.click(container.querySelector(".done-button, .edit-players-button")!);
    await user.click(container.querySelector(".add-player-button")!);

    await user.click(container.querySelectorAll(".delete-button")[1]!);
    expect(container.querySelector(".toast")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(container.querySelectorAll(".player.editing")).toHaveLength(2);
    expect(container.querySelector(".add-player-button")).not.toBeNull();
  });

  it("still leaves edit mode for a press anywhere else", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    await user.click(container.querySelector(".done-button, .edit-players-button")!);
    await user.click(container.querySelector(".add-player-button")!);
    await user.click(container.querySelectorAll(".delete-button")[1]!);

    await user.click(container.querySelector(".content-section")!);

    expect(container.querySelector(".player.editing")).toBeNull();
  });
});

describe("keypad caption", () => {
  const caption = (container: HTMLElement) =>
    container.querySelector(".score-caption")!.textContent;

  it("says whose score is being entered, and in which round", () => {
    const { container } = renderApp("/play/");
    expect(caption(container)).toBe("Player 1 · Round 1");
  });

  it("follows the selection from player to player", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    await addSecondPlayer(user, container);

    expect(caption(container)).toBe("Player 1 · Round 1");
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(caption(container)).toBe("Player 2 · Round 1");
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(caption(container)).toBe("Player 1 · Round 1");
  });

  it("moves on with the player when a score is entered", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    await addSecondPlayer(user, container);

    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(caption(container)).toBe("Player 2 · Round 1");
  });

  it("follows the round", () => {
    const { container } = renderApp("/play/");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(caption(container)).toBe("Player 1 · Round 2");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(caption(container)).toBe("Player 1 · Initial score");
  });

  it("follows a player being renamed", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    await user.click(container.querySelector(".done-button, .edit-players-button")!);
    await user.clear(container.querySelector(".player-name-input")!);
    await user.type(container.querySelector(".player-name-input")!, "Ada");
    await user.click(container.querySelector(".done-button, .edit-players-button")!);

    expect(caption(container)).toBe("Ada · Round 1");
  });

  it("copes with a player whose name has been cleared", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    await user.click(container.querySelector(".done-button, .edit-players-button")!);
    await user.clear(container.querySelector(".player-name-input")!);
    await user.click(container.querySelector(".done-button, .edit-players-button")!);

    expect(caption(container)).toBe("Player · Round 1");
  });

  it("says what to do when the player list is empty, in and out of edit mode", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    await user.click(container.querySelector(".edit-players-button")!);
    await user.click(container.querySelector(".delete-button")!);

    expect(screen.getByText("No players yet")).toBeTruthy();
    expect(screen.getByText("Press Add player to add one")).toBeTruthy();

    await user.click(container.querySelector(".done-button")!);
    expect(screen.getByText("Press Edit players to add some")).toBeTruthy();

    await user.click(container.querySelector(".edit-players-button")!);
    await user.click(container.querySelector(".add-player-button")!);
    expect(container.querySelector(".player-list-empty")).toBeNull();
  });

  it("copes with there being no players", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    await user.click(container.querySelector(".done-button, .edit-players-button")!);
    await user.click(container.querySelector(".delete-button")!);

    expect(caption(container)).toBe("Round 1");
  });

  it("is part of what is announced to a screen reader, together with the number", () => {
    const { container } = renderApp("/play/");
    const status = container.querySelector('.keypad [role="status"]')!;
    expect(status.textContent).toBe("Player 1 · Round 10");
  });
});

describe("labelled buttons", () => {
  describe("the tabs", () => {
    it("are labelled with text, not just an icon", () => {
      const { container } = renderApp("/play/");
      const labels = Array.from(container.querySelectorAll(".buttons-section .tab-label")).map(
        (label) => label.textContent,
      );
      expect(labels).toEqual(["Keypad", "Plot", "Table"]);
    });

    it("have names for assistive technology, and tooltips", () => {
      renderApp("/play/");
      for (const name of ["Keypad", "Plot", "Table"]) {
        const tab = screen.getByRole("tab", { name });
        expect(tab.getAttribute("title")).toBe(name);
      }
    });

    it("do not have the icon's own name as part of theirs", () => {
      const { container } = renderApp("/play/");
      // Without this, a screen reader would say "dialpad Keypad"
      for (const icon of container.querySelectorAll(
        ".buttons-section .material-symbols-outlined",
      )) {
        expect(icon.getAttribute("aria-hidden")).toBe("true");
      }
      expect(screen.getByRole("tab", { name: "Keypad" })).toBeTruthy();
    });

    it("are a tab list, with the current one selected", async () => {
      const user = userEvent.setup();
      renderApp("/play/");
      expect(screen.getByRole("tablist", { name: "View" })).toBeTruthy();
      const selected = () =>
        screen
          .getAllByRole("tab")
          .filter((tab) => tab.getAttribute("aria-selected") === "true")
          .map((tab) => tab.textContent);

      expect(selected()).toEqual(["dialpadKeypad"]);
      await user.click(screen.getByRole("tab", { name: "Plot" }));
      expect(selected()).toEqual(["stacked_line_chartPlot"]);
      await user.click(screen.getByRole("tab", { name: "Table" }));
      expect(selected()).toEqual(["tableTable"]);
    });

    it("lead to a panel for what they show", () => {
      renderApp("/play/");
      expect(screen.getByRole("tabpanel")).toBeTruthy();
    });
  });

  describe("the other icon buttons", () => {
    it("have names", () => {
      renderApp("/play/");
      expect(screen.getByRole("button", { name: "Home" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Edit players" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Previous round" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Next round" })).toBeTruthy();
    });

    it("say what the edit button does now", async () => {
      const user = userEvent.setup();
      renderApp("/play/");

      await user.click(screen.getByRole("button", { name: "Edit players" }));
      expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Edit players" })).toBeNull();
    });

    it("name the add player button, which only exists for assistive technology in edit mode", async () => {
      const user = userEvent.setup();
      renderApp("/play/");

      expect(screen.queryByRole("button", { name: "Add player" })).toBeNull();
      await user.click(screen.getByRole("button", { name: "Edit players" }));
      expect(screen.getByRole("button", { name: "Add player" })).toBeTruthy();
    });

    it("keep the round buttons out of reach when they are not in use", async () => {
      const user = userEvent.setup();
      renderApp("/play/");
      expect(
        screen.getByRole("button", { name: "Next round" }).getAttribute("tabindex"),
      ).toBeNull();

      await user.click(screen.getByRole("tab", { name: "Plot" })); // Not showing a round
      expect(screen.queryByRole("button", { name: "Next round" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Previous round" })).toBeNull();

      await user.click(screen.getByRole("tab", { name: "Keypad" }));
      await user.click(screen.getByRole("button", { name: "Edit players" })); // Editing, so no rounds
      expect(screen.queryByRole("button", { name: "Next round" })).toBeNull();
    });
  });
});

describe("focus after pressing a button", () => {
  // The browser draws a focus ring around a focused button as soon as a key (even Shift, for
  // scrolling sideways) is pressed, so a button that was only clicked must not stay focused.
  const focusedLabel = () => document.activeElement?.getAttribute("aria-label");

  it("is let go of when a button is clicked with the mouse", async () => {
    const user = userEvent.setup();
    renderApp("/play/");

    await user.click(screen.getByRole("tab", { name: "Table" }));

    expect(document.activeElement).toBe(document.body);
  });

  it("is let go of for every kind of button", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");

    // Looked up one at a time, as some of them only exist once an earlier one has been pressed
    const buttons = [
      () => screen.getByRole("button", { name: "Edit players" }),
      () => screen.getByRole("button", { name: "Done" }),
      () => screen.getByRole("button", { name: "Next round" }),
      () => container.querySelector<HTMLElement>(".key-5")!,
    ];
    for (const find of buttons) {
      await user.click(find());
      expect(document.activeElement).toBe(document.body);
    }
  });

  it("is let go of when a button is tapped, too", async () => {
    const user = userEvent.setup();
    renderApp("/play/");

    await user.pointer({ keys: "[TouchA]", target: screen.getByRole("tab", { name: "Plot" }) });

    expect(document.activeElement).not.toBe(screen.getByRole("tab", { name: "Plot" }));
  });

  it("is kept by a button that is pressed with the keyboard, so that its focus ring stays", async () => {
    const user = userEvent.setup();
    renderApp("/play/");
    const plot = screen.getByRole("tab", { name: "Plot" });

    plot.focus();
    await user.keyboard("{Enter}");

    expect(document.activeElement).toBe(plot);
    expect(plot.getAttribute("aria-selected")).toBe("true");
  });

  it("is not taken away from a text box that a click sends it to", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    await user.click(screen.getByRole("button", { name: "Edit players" }));

    await user.click(container.querySelector(".add-player-button")!); // Focuses the new name

    expect(document.activeElement?.className).toBe("player-name-input");
  });

  it("does not matter to pressing something that is not a button", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    await user.click(screen.getByRole("button", { name: "Edit players" }));
    const name = container.querySelector<HTMLInputElement>(".player-name-input")!;

    await user.click(name);

    expect(document.activeElement).toBe(name);
    expect(focusedLabel()).toBeNull();
  });
});

describe("the keyboard and the keypad", () => {
  it("presses a button that has been tabbed to, rather than entering a score", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    const plot = screen.getByRole("tab", { name: "Plot" });

    fireEvent.keyDown(window, { key: "5" });
    plot.focus();
    await user.keyboard("{Enter}");

    expect(container.querySelector(".plot-scores-content")).not.toBeNull(); // The tab worked
    // And no score was entered along the way: the 5 is still waiting to be entered
    await user.click(screen.getByRole("tab", { name: "Keypad" }));
    expect(shownScores(container)).toEqual(["0"]);
  });

  it("presses a button with Space too", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");

    screen.getByRole("tab", { name: "Table" }).focus();
    await user.keyboard(" ");

    expect(container.querySelector(".score-table-content")).not.toBeNull();
  });

  it("still enters the score with Enter when no button has been tabbed to", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");

    await user.click(container.querySelector(".key-7")!); // A click, so nothing is left focused
    fireEvent.keyDown(window, { key: "Enter" });

    expect(shownScores(container)).toEqual(["7"]);
  });

  it("presses a keypad key that has been tabbed to", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");

    container.querySelector<HTMLElement>(".key-8")!.focus();
    await user.keyboard("{Enter}");

    expect(container.querySelector(".score-value")!.textContent).toBe("8");
  });
});

describe("picking out a player's line by pressing them", () => {
  /** Two players, shown on the plot. The first is red, the second orange. */
  async function onThePlot() {
    const user = userEvent.setup();
    const view = renderApp("/play/");
    await addSecondPlayer(user, view.container);
    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "Enter" });
    await user.click(screen.getByRole("tab", { name: "Plot" }));
    const rows = () => Array.from(view.container.querySelectorAll<HTMLElement>(".player"));
    /** Which players' lines are picked out: 0 for the first, 1 for the second */
    const highlighted = () =>
      Array.from(view.container.querySelectorAll(".plot-player.highlighted")).map((line) =>
        defaultColors.indexOf(line.getAttribute("color")!),
      );
    return { user, rows, highlighted, ...view };
  }

  it("makes the line of a player that is pressed bolder, and marks the player", async () => {
    const { user, rows, highlighted } = await onThePlot();

    await user.click(rows()[1]!);

    expect(highlighted()).toEqual([1]);
    expect(rows()[1]!.classList.contains("pinned")).toBe(true);
    expect(rows()[0]!.classList.contains("pinned")).toBe(false);
  });

  it("lets go of the pin when the player is pressed again", async () => {
    const { user, rows } = await onThePlot();

    await user.click(rows()[1]!);
    await user.click(rows()[1]!);

    expect(rows()[1]!.classList.contains("pinned")).toBe(false);
  });

  it("lets go of the line too, once the mouse has moved away", async () => {
    const { user, rows, highlighted } = await onThePlot();

    await user.click(rows()[1]!);
    await user.click(rows()[1]!);
    expect(highlighted()).toEqual([1]); // The mouse is still over them, which shows the line
    await user.unhover(rows()[1]!);

    expect(highlighted()).toEqual([]);
  });

  it("moves to another player when that one is pressed", async () => {
    const { user, rows, highlighted } = await onThePlot();

    await user.click(rows()[0]!);
    await user.click(rows()[1]!);

    expect(rows()[0]!.classList.contains("pinned")).toBe(false);
    expect(rows()[1]!.classList.contains("pinned")).toBe(true);
    expect(highlighted()).toEqual([1]);
  });

  it("works with a finger, which has no hover to do it with", async () => {
    const { user, rows, highlighted } = await onThePlot();

    await user.pointer({ keys: "[TouchA]", target: rows()[0]! });

    expect(highlighted()).toEqual([0]);
    expect(rows()[0]!.classList.contains("pinned")).toBe(true);
  });

  it("can be let go of by touch, as a touchscreen's pretend hover does not hold on to it", async () => {
    const { user, rows, highlighted } = await onThePlot();
    const row = rows()[0]!;

    await user.pointer({ keys: "[TouchA]", target: row });
    fireEvent.pointerEnter(row, { pointerType: "touch" }); // What a touchscreen does on a tap
    await user.pointer({ keys: "[TouchA]", target: row });
    fireEvent.pointerEnter(row, { pointerType: "touch" });

    expect(highlighted()).toEqual([]);
  });

  it("is not made by a touch merely passing over a player", async () => {
    const { rows, highlighted } = await onThePlot();

    fireEvent.pointerEnter(rows()[0]!, { pointerType: "touch" });

    expect(highlighted()).toEqual([]);
  });

  it("shows another player's line while the mouse is over them, then goes back", async () => {
    const { user, rows, highlighted } = await onThePlot();
    await user.click(rows()[0]!); // Pin the first
    expect(highlighted()).toEqual([0]);

    await user.hover(rows()[1]!);
    expect(highlighted()).toEqual([1]);

    await user.unhover(rows()[1]!);
    expect(highlighted()).toEqual([0]);
    expect(rows()[0]!.classList.contains("pinned")).toBe(true);
  });

  it("goes away when the plot does", async () => {
    const { user, rows, highlighted, container } = await onThePlot();
    await user.click(rows()[1]!);

    await user.click(screen.getByRole("tab", { name: "Table" }));
    await user.click(screen.getByRole("tab", { name: "Plot" }));
    await user.unhover(rows()[1]!);

    expect(highlighted()).toEqual([]);
    expect(container.querySelector(".player.pinned")).toBeNull();
  });

  it("stays when the Plot tab is pressed while the plot is already showing", async () => {
    const { user, rows } = await onThePlot();
    await user.click(rows()[1]!);

    await user.click(screen.getByRole("tab", { name: "Plot" }));

    expect(rows()[1]!.classList.contains("pinned")).toBe(true);
  });

  it("does not happen away from the plot, where pressing a player only selects them", async () => {
    const { user, container } = await onThePlot();
    await user.click(screen.getByRole("tab", { name: "Keypad" }));

    await user.click(container.querySelectorAll(".player")[1]!);

    expect(container.querySelector(".player.pinned")).toBeNull();
    expect(container.querySelector(".player.selected")!.textContent).toContain("Player 2");
  });

  it("does not happen while editing", async () => {
    const { user, container } = await onThePlot();
    await user.click(screen.getByRole("button", { name: "Edit players" }));

    await user.click(container.querySelectorAll(".player")[1]!);

    expect(container.querySelector(".player.pinned")).toBeNull();
  });
});

describe("letting go of a pinned player by pressing elsewhere", () => {
  /** Two players on the plot, with the second one pinned */
  async function withSecondPlayerPinned() {
    const user = userEvent.setup();
    const view = renderApp("/play/");
    await addSecondPlayer(user, view.container);
    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "Enter" });
    await user.click(screen.getByRole("tab", { name: "Plot" }));
    await user.click(view.container.querySelectorAll(".player")[1]!);
    const pinned = () => view.container.querySelector(".player.pinned") !== null;
    const highlightedLines = () =>
      view.container.querySelectorAll(".plot-player.highlighted").length;
    expect(pinned()).toBe(true);
    return { user, pinned, highlightedLines, ...view };
  }

  it("happens when the plot is pressed", async () => {
    const { user, container, pinned, highlightedLines } = await withSecondPlayerPinned();

    await user.click(container.querySelector(".plot-area")!);

    expect(pinned()).toBe(false);
    expect(highlightedLines()).toBe(0);
  });

  it("happens when something else that is not a button is pressed", async () => {
    const { user, container, pinned } = await withSecondPlayerPinned();

    await user.click(container.querySelector(".top-left-section")!);

    expect(pinned()).toBe(false);
  });

  it("happens for the empty space around the plot too", async () => {
    const { user, container, pinned } = await withSecondPlayerPinned();

    await user.click(container.querySelector(".plot-scores-content")!);

    expect(pinned()).toBe(false);
  });

  it("happens when the plot is touched", async () => {
    const { user, container, pinned, highlightedLines } = await withSecondPlayerPinned();
    await user.unhover(container.querySelectorAll(".player")[1]!); // A touchscreen has no mouse to leave there

    await user.pointer({ keys: "[TouchA]", target: container.querySelector(".plot-area")! });

    expect(pinned()).toBe(false);
    expect(highlightedLines()).toBe(0);
  });

  it("does not happen for a button, or for the icon or the label inside one", async () => {
    const { user, pinned } = await withSecondPlayerPinned();
    const plotTab = screen.getByRole("tab", { name: "Plot" });

    await user.click(plotTab); // The button itself
    expect(pinned()).toBe(true);
    await user.click(plotTab.querySelector(".material-symbols-outlined")!); // The icon in the tab
    expect(pinned()).toBe(true);
    await user.click(plotTab.querySelector(".tab-label")!); // And its label
    expect(pinned()).toBe(true);
  });

  it("happens for a press inside the player list, but not on a player", async () => {
    const first = await withSecondPlayerPinned();
    await first.user.click(first.container.querySelector(".round-label")!); // The heading of the list
    expect(first.pinned()).toBe(false);
    cleanup();

    const second = await withSecondPlayerPinned();
    await second.user.click(second.container.querySelector(".player-list")!); // Between players
    expect(second.pinned()).toBe(false);
  });

  it("does not happen for a press on another player, which pins that one instead", async () => {
    const { user, container } = await withSecondPlayerPinned();

    await user.click(container.querySelectorAll(".player")[0]!);

    const pinnedRows = container.querySelectorAll(".player.pinned");
    expect(pinnedRows).toHaveLength(1);
    expect(pinnedRows[0]).toBe(container.querySelectorAll(".player")[0]);
  });

  it("does not stop the player being pinned again afterwards", async () => {
    const { user, container, pinned } = await withSecondPlayerPinned();

    await user.click(container.querySelector(".plot-area")!);
    expect(pinned()).toBe(false);
    await user.click(container.querySelectorAll(".player")[1]!);

    expect(pinned()).toBe(true);
  });

  it("does nothing when nobody is pinned", async () => {
    const user = userEvent.setup();
    const { container } = renderApp("/play/");
    await user.click(screen.getByRole("tab", { name: "Plot" }));

    await user.click(container.querySelector(".game-name-label")!);

    expect(container.querySelector(".player.pinned")).toBeNull();
  });
});

describe("flashing the row of a player whose score was updated", () => {
  const flashing = (container: HTMLElement) =>
    Array.from(container.querySelectorAll(".player")).map(
      (row) => row.classList.contains("flash-a") || row.classList.contains("flash-b"),
    );
  const enterScore = (score: string) => {
    for (const key of score) fireEvent.keyDown(window, { key });
    fireEvent.keyDown(window, { key: "Enter" });
  };

  async function twoPlayers() {
    const user = userEvent.setup();
    const view = renderApp("/play/");
    await addSecondPlayer(user, view.container);
    return { user, ...view };
  }

  it("does not flash anything to begin with", async () => {
    const { container } = await twoPlayers();
    expect(flashing(container)).toEqual([false, false]);
  });

  describe("after a score is entered on the keypad", () => {
    it("flashes the row of the player the score is for, and no other", async () => {
      const { container } = await twoPlayers();

      enterScore("5");

      expect(flashing(container)).toEqual([true, false]);
    });

    it("flashes each player as they score", async () => {
      const { container } = await twoPlayers();

      enterScore("5");
      enterScore("3");

      expect(flashing(container)).toEqual([true, true]);
    });

    it("starts the flash over for a player who scores again, with a different animation", async () => {
      const { container } = await twoPlayers();
      const first = () => container.querySelectorAll(".player")[0]!;

      enterScore("5"); // Player 1
      expect(first().classList.contains("flash-a")).toBe(true);
      enterScore("3"); // Player 2
      enterScore("2"); // Player 1 again, in the same round: a different score
      expect(first().classList.contains("flash-b")).toBe(true);
      expect(first().classList.contains("flash-a")).toBe(false);
      enterScore("1"); // Player 2
      enterScore("4"); // Player 1 again
      expect(first().classList.contains("flash-a")).toBe(true);
    });

    it("flashes even if the score is the same as it was", async () => {
      const { container } = await twoPlayers();
      enterScore("0"); // A score of zero, which is what Player 1 already had
      expect(flashing(container)).toEqual([true, false]);
    });
  });

  describe("after a score is changed in the table", () => {
    async function onTheTable() {
      const view = await twoPlayers();
      enterScore("5");
      enterScore("3");
      await view.user.click(screen.getByRole("tab", { name: "Table" }));
      // Starting afresh, so that what is seen has come from editing the table
      await view.user.click(screen.getByRole("tab", { name: "Plot" }));
      await view.user.click(screen.getByRole("tab", { name: "Table" }));
      return view;
    }
    const scoreButton = (container: HTMLElement, player: number) =>
      container.querySelectorAll<HTMLElement>("tbody tr:nth-child(1) .score-button")[player]!;

    it("flashes the row of the player whose score it is", async () => {
      const { user, container } = await onTheTable();
      const before = flashing(container); // Both flashed, from entering their scores

      await user.click(scoreButton(container, 1));
      await user.keyboard("9{Enter}");

      expect(before).toEqual([true, true]);
      const rows = container.querySelectorAll(".player");
      expect(rows[1]!.classList.contains("flash-b")).toBe(true); // The second time for Player 2
      expect(rows[0]!.classList.contains("flash-a")).toBe(true); // Still the first time for Player 1
    });

    it("does not when the score is left as it was, or cancelled, or is not a number", async () => {
      const { user, container } = await onTheTable();
      const classes = () =>
        Array.from(container.querySelectorAll(".player")).map((row) => row.className);
      const before = classes();

      await user.click(scoreButton(container, 0));
      await user.keyboard("5{Enter}"); // The same
      await user.click(scoreButton(container, 0));
      await user.keyboard("8{Escape}"); // Cancelled
      await user.click(scoreButton(container, 0));
      await user.keyboard("abc{Enter}"); // Not a number

      expect(classes()).toEqual(before);
    });
  });

  describe("not when nothing was updated", () => {
    it("does not flash when moving between players", async () => {
      const { container } = await twoPlayers();

      fireEvent.keyDown(window, { key: "ArrowDown" });
      fireEvent.keyDown(window, { key: "ArrowUp" });

      expect(flashing(container)).toEqual([false, false]);
    });

    it("does not flash when moving between rounds", async () => {
      const { container } = await twoPlayers();

      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyDown(window, { key: "ArrowLeft" });

      expect(flashing(container)).toEqual([false, false]);
    });

    it("does not flash when a player is selected by pressing them", async () => {
      const { user, container } = await twoPlayers();
      await user.click(container.querySelectorAll(".player")[1]!);
      expect(flashing(container)).toEqual([false, false]);
    });

    it("does not flash when players are changed, such as being renamed or added", async () => {
      const user = userEvent.setup();
      const { container } = renderApp("/play/");
      await user.click(screen.getByRole("button", { name: "Edit players" }));
      await user.type(container.querySelector(".player-name-input")!, "x");
      await user.click(container.querySelector(".add-player-button")!);

      expect(flashing(container)).toEqual([false, false]);
    });

    it("does not flash a number that is only being typed", async () => {
      const { container } = await twoPlayers();
      fireEvent.keyDown(window, { key: "7" });
      expect(flashing(container)).toEqual([false, false]);
    });

    it("does not need a player to be there", async () => {
      const user = userEvent.setup();
      const { container } = renderApp("/play/");
      await user.click(screen.getByRole("button", { name: "Edit players" }));
      await user.click(container.querySelector(".delete-button")!);
      await user.click(screen.getByRole("button", { name: "Done" }));

      expect(() => enterScore("5")).not.toThrow();
      expect(container.querySelectorAll(".player")).toHaveLength(0);
    });
  });
});
