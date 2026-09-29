
import "./TitlePage.scss";
import { useNavigate } from "react-router-dom";

export function TitlePage() {
  const navigate = useNavigate();

  function handleLoadGameClick() {
    navigate(`/play`);
  }

  return (
    <div className="background title-page-background">
      <div className="main-card title-page-content">
        <h1 className="title">SCOREKEEPER</h1>
        <button className="button button-large" onClick={() => navigate("/play")}>Start New Game</button>
        <button className="button button-large" onClick={handleLoadGameClick}>
          <div className="continue-game-text">Continue Game</div>
          <div className="continue-game-name">&lt;saved game&gt;</div>
        </button>
      </div>
    </div>
  );
}
