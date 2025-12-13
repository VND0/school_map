import sqlalchemy.exc

from database.database import get_session
from database.db_models import Object
import json


def setup():
    with open("setupData.json", encoding="utf-8") as f:
        objects = json.load(f)
    session = next(get_session())

    for name, data in objects.items():
        identifiers, description = data
        for identifier in identifiers:
            new_object = Object(id=identifier, title=name, description=description, image_path="")
            session.add(new_object)

    try:
        session.commit()
    except sqlalchemy.exc.IntegrityError:
        print("WARNING: objects with such IDs already exist. Making no changes")
