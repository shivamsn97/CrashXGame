from telegram.ext import ExtBot, ApplicationBuilder, Defaults
import config
from db import CryptoGameDB

tg_app = ApplicationBuilder() \
            .token(config.TG_BOT_TOKEN) \
            .defaults(Defaults(parse_mode='HTML')) \
            .build()

db = CryptoGameDB(dbname=config.PG_DATABASE, user=config.PG_USER, password=config.PG_PASSWORD, host=config.PG_HOST, port=config.PG_PORT)