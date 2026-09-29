from sqlalchemy import Integer, String, Float, ForeignKey, create_engine
from sqlalchemy.orm import Mapped, mapped_column, relationship, declarative_base, scoped_session, sessionmaker

from typing import Any

engine = create_engine("sqlite:///test.db", echo=False)
db = scoped_session(sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
))

Base = declarative_base()
Base.query = db.query_property()

def init_db():
    Base.metadata.create_all(bind=engine)

class GameEntity(Base):
    __tablename__ = "game"

    id: Mapped[int] = mapped_column(primary_key=True)
    share_key: Mapped[int] = mapped_column(String(12))
    name: Mapped[str] = mapped_column(String(40))

    scorecards: Mapped[list["ScorecardEntity"]] = relationship(back_populates="game")

    def to_dict(self) -> dict[str, Any]:
        return {
            "share_key": self.share_key,
            "name": self.name,
            "scorecards": [scorecard.to_dict() for scorecard in self.scorecards],
        }


class ScorecardEntity(Base):
    __tablename__ = "scorecard"

    id: Mapped[int] = mapped_column(primary_key=True)
    player_name: Mapped[str] = mapped_column(String(40))

    game_id = mapped_column(ForeignKey("game.id"))
    game: Mapped[GameEntity] = relationship(back_populates="scorecards")

    scores: Mapped[list["ScoreEntity"]] = relationship(back_populates="scorecard")

    def to_dict(self) -> dict[str, Any]:
        return {
            "player_name": self.player_name,
            "scores": [score.to_dict() for score in self.scores],
        }


class ScoreEntity(Base):
    __tablename__ = "score"

    id: Mapped[int] = mapped_column(primary_key=True)
    round: Mapped[int] = mapped_column(Integer)
    score: Mapped[float] = mapped_column(Float)

    scorecard_id = mapped_column(ForeignKey("scorecard.id"))
    scorecard: Mapped[ScorecardEntity] = relationship(back_populates="scores")

    def to_dict(self) -> dict[str, Any]:
        return {
            "round": self.round,
            "score": self.score,
        }
