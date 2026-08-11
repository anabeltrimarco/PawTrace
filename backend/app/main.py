from fastapi import FastAPI
from app.routers import users,pets,reports,matches

app=FastAPI(title="PetAlert AI API",version="0.1.0")

app.include_router(users.router,prefix="/users",tags=["Users"])
app.include_router(pets.router,prefix="/pets",tags=["Pets"])
app.include_router(reports.router,prefix="/reports",tags=["Reports"])
app.include_router(matches.router,prefix="/matches",tags=["Matches"])

@app.get("/")
def root():
    return {"message":"PetAlert AI API running"}
