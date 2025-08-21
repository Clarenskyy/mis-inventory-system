from pydantic import BaseModel

class ItemBase(BaseModel):
    name: str
    code: str
    quantity: int
    buffer: int

class ItemCreate(ItemBase):
    pass

class ItemResponse(ItemBase):
    id: int
    class Config:
        orm_mode = True
