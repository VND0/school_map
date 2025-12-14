import sqlalchemy.exc
import os

from pathlib import Path
from database.database import get_session
from database.db_models import Object
import json


def find_image_path(prefix: str) -> str | None:
    entries = os.listdir("images")
    for entry in entries:
        if entry.startswith(prefix):
            return os.path.join("images", entry)
    return None


def setup():
    original_cwd = os.getcwd()
    script_dir = Path(__file__).resolve().parent
    os.chdir(script_dir)

    with open("setupData.json", encoding="utf-8") as f:
        objects = json.load(f)
    session = next(get_session())

    for name, data in objects.items():
        identifiers, image_path_prefix, description = data

        file_path = find_image_path(image_path_prefix)
        file_content = None
        if file_path is None:
            print(f"WARNING: image for {image_path_prefix} not found. Leaving NULL")
        else:
            with open(file_path, "rb") as f:
                file_content = f.read()

        for identifier in identifiers:
            new_object = Object(id=identifier, title=name, description=description, image=file_content)
            session.add(new_object)

    try:
        session.commit()
    except sqlalchemy.exc.IntegrityError:
        print("WARNING: objects with such IDs already exist. Making no changes")
    os.chdir(original_cwd)
