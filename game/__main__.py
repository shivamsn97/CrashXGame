import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs
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
    
@socketio.on('connection_data')
def connection_data(data):
    print(data)
    
WEBAPP_SECRET_KEY = hmac.new('WebAppData'.encode('utf-8'), config.TG_BOT_TOKEN.encode('utf-8'), hashlib.sha256).digest()


def check_web_app_signature(init_data):
    query_params = parse_qs(init_data)
    auth_date = int(query_params.get("auth_date", [0])[0])
    hash_value = query_params.get("hash", [None])[0]
    query_params.pop("hash", None)
    sorted_params = sorted(query_params.items(), key=lambda x: x[0])
    data_check_string = "\n".join([f"{n}={v[0]}" for n, v in sorted_params])
    key = hmac.new(WEBAPP_SECRET_KEY, data_check_string.encode('utf-8'), hashlib.sha256).hexdigest()
    if key != hash_value:
        raise ValueError("HASH_MISMATCH")
    return True
    

@app.route('/api/tg_validate', methods=['POST'])
def tg_validate():
    try:
        check_web_app_signature(request.get_json()['_auth'])
    except ValueError as e:
        return {'ok': False, 'error': str(e)}
    return {'ok': True}
    



if __name__ == '__main__':
    socketio.run(app, debug=True, use_reloader=False)
