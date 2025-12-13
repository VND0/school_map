from sqlalchemy import String, Integer, LargeBinary
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, deferred


class Base(DeclarativeBase):
    pass


class Object(Base):
    __tablename__ = "objects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    image: Mapped[bytes] = deferred(mapped_column(LargeBinary, nullable=True))
