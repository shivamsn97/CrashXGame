from flask import Flask, request
from flask_socketio import SocketIO

import config

app = Flask(__name__, static_folder='../static')
app.config['SECRET_KEY'] = 'jirfhw3yug428qwyedvfgrwt238yew'
socketio = SocketIO(app, cors_allowed_origins="*")
