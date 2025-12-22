import uvicorn
from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import setup_data.script
from database.database import create_db_and_tables, get_session
from database.db_models import Object

app = FastAPI()
sessions = get_session()
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/object-data")
async def get_object_data(identifier: int):
    session = next(sessions)
    map_object: Object = session.query(Object).filter(Object.id == identifier).one_or_none()
    if not map_object:
        raise HTTPException(404, "Map object not found")

    return {
        "title": map_object.title,
        "description": map_object.description,
        "urlToImage": f"/object-image/{identifier}"
    }


@app.get("/object-image/{identifier}")
async def get_object_image(identifier: int):
    session = next(sessions)
    map_object: Object = session.query(Object).filter(Object.id == identifier).one_or_none()
    if not map_object:
        raise HTTPException(404, "Map object not found")

    image = map_object.image
    return Response(
        content=image,
        media_type="application/octet-stream",
    )


# After all routes
app.mount("/", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    create_db_and_tables()
    setup_data.script.setup()
    uvicorn.run(app, host="0.0.0.0", port=8000)
