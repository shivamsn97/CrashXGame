from telegram.ext import MessageHandler, filters, CommandHandler
from bot import tg_app
import config
from bot.modules import ALL_MODULES
import importlib

async def start(update, context):
    await update.message.reply_text('Hi! Welcome to Crash X. Use /game to start the game.')
    
tg_app.add_handler(CommandHandler('start', start))

IMPORTED = {}

HELP = {}
HELP_GROUPS = {}

SKIP_MODULES = ["language", "services", "results", "radevou", "portfolio_management", "language"]

for module_name in ALL_MODULES:
    if module_name in SKIP_MODULES:
        continue
    imported_module = importlib.import_module("bot.modules." + module_name)
    if not hasattr(imported_module, "__mod_name__"):
        imported_module.__mod_name__ = imported_module.__name__

    if hasattr(imported_module, "HELP"):
        HELP[imported_module.__mod_name__] = imported_module.HELP

    if hasattr(imported_module, "HELP_GROUP"):
        HELP_GROUPS[imported_module.__mod_name__] = imported_module.HELP_GROUP

    if not imported_module.__mod_name__.lower() in IMPORTED:
        IMPORTED[imported_module.__mod_name__.lower()] = imported_module
    else:
        raise Exception("Can't have two modules with the same name! Please change one")


async def init_bot():
    await tg_app.bot.setWebhook(f'{config.BASE_URL}/api/tg/{config.TG_BOT_TOKEN}')
    await tg_app.initialize()
    await tg_app.start()
    
tg_app.run_polling()