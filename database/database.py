from .db_models import Base

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine("sqlite:///database/database.db")
Session = sessionmaker(bind=engine)


def create_db_and_tables():
    Base.metadata.create_all(engine)


def get_session():
    while True:
        with Session() as session:
            yield session
