from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base,sessionmaker
import os

DATABASE_URL=os.getenv("DATABASE_URL","postgresql://petalert:petalert@localhost:5432/petalert")

engine=create_engine(DATABASE_URL)
SessionLocal=sessionmaker(bind=engine,autocommit=False,autoflush=False)
Base=declarative_base()
