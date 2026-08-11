from sqlalchemy import Column,Integer,String,Float,ForeignKey
from app.database import Base

class User(Base):
    __tablename__="users"
    id=Column(Integer,primary_key=True,index=True)
    name=Column(String)
    email=Column(String,unique=True,index=True)

class Pet(Base):
    __tablename__="pets"
    id=Column(Integer,primary_key=True,index=True)
    user_id=Column(Integer,ForeignKey("users.id"))
    name=Column(String)
    species=Column(String)
    breed=Column(String)
    color=Column(String)
    latitude=Column(Float)
    longitude=Column(Float)
