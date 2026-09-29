from flask import Blueprint, request, jsonify
from ..models import db, GameEntity
import random

games_blueprint = Blueprint("games", __name__, url_prefix="/games")

@games_blueprint.route("", methods=["POST"])
def create_game():

    game = GameEntity(
        name=request.json["name"],
        share_key="".join(random.choices("abcdefghijkmnopqrstuvwxyz", k=6))
    )

    print(GameEntity.query.all())

    db.add(game)
    db.commit()

    return jsonify(game.to_dict()), 200


@games_blueprint.route("/<int:share_key>", methods=["GET"])
def get_game():
    ...


@games_blueprint.route("", methods=["PUT"])
def save_game():
    ...
