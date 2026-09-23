from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
from sqlmodel import Session, select
from database import create_db_and_tables, get_session
from models import Task
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def index():
    return {"message": "API de Tareas activa"}

@app.post("/tasks")
def create_task(task: Task, db: Session = Depends(get_session)):
    db.add(task)

    db.commit()

    db.refresh(task)

    return task

@app.get("/tasks")
def read_tasks(db: Session = Depends(get_session)):
    statement = select(Task)
    tasks = db.exec(statement).all()
    return tasks

@app.patch("/tasks/{task_id}")
def edit_tasks(task_id: int, db: Session = Depends(get_session)):
    db_task = db.get(Task, task_id)

    if not db_task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    db_task.completed = not db_task.completed
    db.commit()
    db.refresh(db_task)

    return db_task

class TaskUpdate(BaseModel):
    title: str

@app.put("/tasks/{task_id}")
async def update_task(task_id: int, task_data: TaskUpdate, db: Session = Depends(get_session)):
    db_task = db.get(Task, task_id)
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    db_task.title = task_data.title
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/tasks/{task_id}")
def delete_tasks(task_id: int, db: Session = Depends(get_session)):
    db_task = db.get(Task, task_id)
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    db.delete(db_task)
    db.commit()

    return {"message": "Tarea eliminada con exito."}