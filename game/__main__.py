from flask import Flask, request
from flask_socketio import SocketIO, emit
import config
from game import socketio
import asyncio
from db import CryptoGameDB, CurrentGame

app = Flask(__name__, static_folder='../static')
app.config['SECRET_KEY'] = 'jirfhw3yug428qwyedvfgrwt238yew'
socketio = SocketIO(app, cors_allowed_origins="*")


class GameHandler:
    def __init__(self):
        self.db = CryptoGameDB(dbname=config.PG_DATABASE, user=config.PG_USER, password=config.PG_PASSWORD, host=config.PG_HOST, port=config.PG_PORT)
        self.current_game = None
        
    def start_game(self):
        self.current_game = CurrentGame(self.db)
        self.current_game.start_game()
        
    def get_current_game(self):
        return self.current_game

@app.route('/')
def index():
    return 'Hello, world!'

@socketio.on('connect')
def test_connect():
    print('Client connected')

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

# endpoint to measure latency
@socketio.on('ping')
def ping():
    # time.sleep(random.triangular(0, 1, 0.07))
    emit('pong')

if __name__ == '__main__':
    socketio.run(app, debug=True, use_reloader=False)
