from flask_pymongo import PyMongo

mongo = PyMongo()


def get_db():
    """Returns the mindairy database."""
    return mongo.db