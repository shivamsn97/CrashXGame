from telegram.ext import ExtBot, ApplicationBuilder, Defaults
import config

tg_app = ApplicationBuilder() \
            .token(config.TG_BOT_TOKEN) \
            .defaults(Defaults(parse_mode='HTML')) \
            .build()
