import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Game, UpdateGameAction } from "@/Game";
import { GameContext } from "@/GameContext";
import { ScoreTableComponent } from "./ScoreTableComponent";

const game: Game = {
  id: "g",
  name: "Test",
  scorecards: [
    { id: "a", playerName: "Ada", color: "#e6194b", scores: [0, 5, -2] },
    { id: "b", playerName: "Bo", color: "#4363d8", scores: [0, 3, 4] },
  ],
};

function renderTable(overrides: Partial<Game> = {}) {
  const updateGame = vi.fn<(action: UpdateGameAction) => void>();
  const onScoreChanged = vi.fn<(playerId: string) => void>();
  const view = render(
    <GameContext value={{ game: { ...game, ...overrides }, updateGame, hasGame: true }}>
      <ScoreTableComponent onScoreChanged={onScoreChanged} />
    </GameContext>,
  );
  return { updateGame, onScoreChanged, user: userEvent.setup(), ...view };
}

const scoreButton = (player: string, round: string) =>
  screen.getByRole("button", { name: new RegExp(`Edit ${player}'s ${round},`) });
const box = () => screen.getByRole("textbox") as HTMLInputElement;

describe("editing a score in the table", () => {
  describe("starting", () => {
    it("shows every score as a button, with the number as its text", () => {
      renderTable();
      expect(scoreButton("Ada", "round 1").textContent).toBe("5");
      expect(scoreButton("Ada", "round 2").textContent).toBe("-2");
      expect(scoreButton("Bo", "round 2").textContent).toBe("4");
    });

    it("tells assistive technology which score it is, and what it is now", () => {
      renderTable();
      expect(screen.getByRole("button", { name: "Edit Ada's round 1, now 5" })).toBeTruthy();
    });

    it("says that scores can be edited", () => {
      renderTable();
      expect(screen.getByText("Tap a score to edit it")).toBeTruthy();
    });

    it("turns the score into a text box, with the number selected and ready to be typed over", async () => {
      const { user } = renderTable();

      await user.click(scoreButton("Ada", "round 1"));

      expect(box().value).toBe("5");
      expect(document.activeElement).toBe(box());
      expect([box().selectionStart, box().selectionEnd]).toEqual([0, 1]);
    });

    it("names the text box for assistive technology", async () => {
      const { user } = renderTable();
      await user.click(scoreButton("Bo", "round 2"));
      expect(screen.getByRole("textbox", { name: "Bo, round 2" })).toBeTruthy();
    });

    it("takes the place of the button, so that there is one thing in the cell", async () => {
      const { user } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));
      expect(screen.queryByRole("button", { name: /Edit Ada's round 1/ })).toBeNull();
      expect(screen.getAllByRole("textbox")).toHaveLength(1);
    });

    it("types over the whole number", async () => {
      const { user } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));
      await user.keyboard("42");
      expect(box().value).toBe("42");
    });
  });

  describe("saving", () => {
    it("saves with Enter", async () => {
      const { user, updateGame, onScoreChanged } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));

      await user.keyboard("9{Enter}");

      expect(updateGame).toHaveBeenCalledTimes(1);
      expect(updateGame).toHaveBeenCalledWith({
        type: "add_score",
        playerId: "a",
        round: 1,
        score: 9,
      });
      expect(onScoreChanged).toHaveBeenCalledExactlyOnceWith("a");
      expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("saves by pressing somewhere else, once", async () => {
      const { user, updateGame, onScoreChanged } = renderTable();
      await user.click(scoreButton("Bo", "round 2"));

      await user.keyboard("7");
      await user.click(screen.getByText("Tap a score to edit it"));

      expect(updateGame).toHaveBeenCalledExactlyOnceWith({
        type: "add_score",
        playerId: "b",
        round: 2,
        score: 7,
      });
      expect(onScoreChanged).toHaveBeenCalledExactlyOnceWith("b");
    });

    it("saves negative numbers and decimals", async () => {
      const { user, updateGame } = renderTable();

      await user.click(scoreButton("Ada", "round 1"));
      await user.keyboard("-3.5{Enter}");
      await user.click(scoreButton("Bo", "round 1"));
      await user.keyboard("0.25{Enter}");

      expect(updateGame).toHaveBeenNthCalledWith(1, expect.objectContaining({ score: -3.5 }));
      expect(updateGame).toHaveBeenNthCalledWith(2, expect.objectContaining({ score: 0.25 }));
    });

    it("saves a score of zero", async () => {
      const { user, updateGame } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));
      await user.keyboard("0{Enter}");
      expect(updateGame).toHaveBeenCalledWith(expect.objectContaining({ score: 0 }));
    });

    it("saves a number that was typed with spaces around it", async () => {
      const { user, updateGame } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));
      await user.keyboard("  12  {Enter}");
      expect(updateGame).toHaveBeenCalledWith(expect.objectContaining({ score: 12 }));
    });

    it("saves a score that is changed by a little, such as removing a digit", async () => {
      const { user, updateGame } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));
      await user.keyboard("{End}5{Enter}"); // 5 becomes 55
      expect(updateGame).toHaveBeenCalledWith(expect.objectContaining({ score: 55 }));
    });
  });

  describe("not saving", () => {
    it("does nothing when Escape is pressed", async () => {
      const { user, updateGame, onScoreChanged } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));

      await user.keyboard("99{Escape}");

      expect(updateGame).not.toHaveBeenCalled();
      expect(onScoreChanged).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(scoreButton("Ada", "round 1").textContent).toBe("5");
    });

    it("does not save the same score again", async () => {
      const { user, updateGame, onScoreChanged } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));

      await user.keyboard("5{Enter}");

      expect(updateGame).not.toHaveBeenCalled();
      expect(onScoreChanged).not.toHaveBeenCalled();
    });

    it.each([
      ["nothing", ""],
      ["words", "abc"],
      ["a lone point", "."],
      ["a lone minus", "-"],
      ["a number with something after it", "12abc"],
      ["two numbers", "1 2"],
      ["infinity", "Infinity"],
    ])("does not save %s, and shows the old score again", async (_, text) => {
      const { user, updateGame } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));
      await user.clear(box());
      if (text) await user.keyboard(text);

      await user.keyboard("{Enter}");

      expect(updateGame).not.toHaveBeenCalled();
      expect(scoreButton("Ada", "round 1").textContent).toBe("5");
    });
  });

  describe("moving between scores", () => {
    it("saves the first when another is pressed, and starts on that one", async () => {
      const { user, updateGame } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));
      await user.keyboard("8");

      await user.click(scoreButton("Bo", "round 1"));

      expect(updateGame).toHaveBeenCalledExactlyOnceWith({
        type: "add_score",
        playerId: "a",
        round: 1,
        score: 8,
      });
      expect(screen.getAllByRole("textbox")).toHaveLength(1);
      expect(box().value).toBe("3");
    });

    it("only ever has one text box", async () => {
      const { user } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));
      await user.click(scoreButton("Ada", "round 2"));
      await user.click(scoreButton("Bo", "round 2"));
      expect(screen.getAllByRole("textbox")).toHaveLength(1);
    });
  });

  describe("with the keyboard", () => {
    it("opens on Enter, and puts the focus back on the score once it is saved", async () => {
      const { user } = renderTable();
      const button = scoreButton("Ada", "round 1");

      button.focus();
      await user.keyboard("{Enter}");
      expect(document.activeElement).toBe(box());
      await user.keyboard("9{Enter}");

      await waitFor(() => expect(document.activeElement).toBe(scoreButton("Ada", "round 1")));
    });

    it("does not start editing again when the Enter that saved it reaches the score", async () => {
      const { user } = renderTable();
      scoreButton("Ada", "round 1").focus();

      await user.keyboard("{Enter}9{Enter}");
      await waitFor(() => expect(document.activeElement).toBe(scoreButton("Ada", "round 1")));

      expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("opens on Space", async () => {
      const { user } = renderTable();
      scoreButton("Bo", "round 1").focus();
      await user.keyboard(" ");
      expect(box().value).toBe("3");
    });

    it("puts the focus back after Escape too", async () => {
      const { user } = renderTable();
      scoreButton("Ada", "round 2").focus();
      await user.keyboard("{Enter}{Escape}");
      await waitFor(() => expect(document.activeElement).toBe(scoreButton("Ada", "round 2")));
    });

    it("does not take the focus back after pressing somewhere else", async () => {
      const { user } = renderTable();
      await user.click(scoreButton("Ada", "round 1"));
      await user.keyboard("9");

      await user.click(screen.getByText("Tap a score to edit it"));

      expect(document.activeElement).not.toBe(scoreButton("Ada", "round 1"));
    });

    it("can be reached with Tab", async () => {
      const { user } = renderTable();
      await user.tab();
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Edit Ada's round 1, now 5");
    });
  });

  describe("different kinds of scores", () => {
    it("labels the starting scores when they are shown", async () => {
      const { user } = renderTable({
        scorecards: [{ id: "a", playerName: "Ada", color: "#e6194b", scores: [10, 5] }],
      });
      await user.click(screen.getByRole("button", { name: "Edit Ada's starting score, now 10" }));
      expect(screen.getByRole("textbox", { name: "Ada, starting score" })).toBeTruthy();
    });

    it("can set the score for a round that a player has not got one for yet", async () => {
      const { user, updateGame } = renderTable({
        scorecards: [
          { id: "a", playerName: "Ada", color: "#e6194b", scores: [0, 5, 1] },
          { id: "b", playerName: "Bo", color: "#4363d8", scores: [0, 3] }, // No round 2
        ],
      });

      await user.click(scoreButton("Bo", "round 2"));
      expect(box().value).toBe("0");
      await user.keyboard("6{Enter}");

      expect(updateGame).toHaveBeenCalledWith({
        type: "add_score",
        playerId: "b",
        round: 2,
        score: 6,
      });
    });

    it("does not get in the way of the totals", () => {
      renderTable();
      expect(screen.getByText("Total")).toBeTruthy();
      const totals = Array.from(document.querySelectorAll(".total-cell")).map(
        (cell) => cell.textContent,
      );
      expect(totals).toEqual(["3", "7"]);
    });

    it("works without anything to tell when a score changes", async () => {
      const updateGame = vi.fn();
      const user = userEvent.setup();
      render(
        <GameContext value={{ game, updateGame, hasGame: true }}>
          <ScoreTableComponent />
        </GameContext>,
      );

      await user.click(scoreButton("Ada", "round 1"));
      await user.keyboard("9{Enter}");

      expect(updateGame).toHaveBeenCalledTimes(1);
    });
  });

  it("finishes only once, even if Enter is pressed and the box also loses focus", async () => {
    const { user, updateGame } = renderTable();
    await user.click(scoreButton("Ada", "round 1"));
    await user.keyboard("9");
    const input = box();

    // Both reach the box before it has been taken away, as can happen in a browser
    act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.blur(input);
    });

    expect(updateGame).toHaveBeenCalledTimes(1);
  });
});
