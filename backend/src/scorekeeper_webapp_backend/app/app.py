"""Main app"""

from flask import Flask

from .models import db, init_db

def create_app() -> Flask:
    app = Flask(__name__, instance_relative_config=True)

    # ========== Register routes ==========
    from .routes import games_blueprint
    app.register_blueprint(games_blueprint, url_prefix=f"/api/v1{games_blueprint.url_prefix}")

    # ========== Set Up Database ==========
    init_db()

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db.remove()

    return app


def run():
    app = create_app()
    app.run(debug=True)
