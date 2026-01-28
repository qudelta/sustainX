from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class MaterialType(str, Enum):
    NONE = "none"
    BRICK = "brick"
    CONCRETE = "concrete"
    WOOD = "wood"
    GLASS = "glass"
    INSULATED = "insulated"
    STEEL = "steel"
    WOOD_PANEL = "wood_panel"


class SealingType(str, Enum):
    POOR = "poor"
    AVERAGE = "average"
    GOOD = "good"
    EXCELLENT = "excellent"


class WallSchema(BaseModel):
    id: str
    x1: float
    y1: float
    x2: float
    y2: float
    height: float = Field(default=2.8, description="Wall height in meters")
    thickness: float = Field(default=0.2, description="Wall thickness in meters")
    material: MaterialType = MaterialType.BRICK
    u_value: Optional[float] = Field(default=None, description="U-value override in W/(m²·K)")
    wall_insulation_material: MaterialType = MaterialType.NONE


class WindowSchema(BaseModel):
    id: str
    wall_id: str
    position: float = Field(description="Position along wall (0-1)")
    width: float = Field(description="Width in meters")
    height: float = Field(description="Height in meters")
    u_value: float = Field(default=2.8, description="U-value in W/(m²·K)")
    sealing: SealingType = SealingType.AVERAGE


class DoorSchema(BaseModel):
    id: str
    wall_id: str
    position: float = Field(description="Position along wall (0-1)")
    width: float = Field(default=0.9, description="Width in meters")
    height: float = Field(default=2.1, description="Height in meters")
    u_value: float = Field(default=2.0, description="U-value in W/(m²·K)")
    sealing: SealingType = SealingType.AVERAGE


class FloorCeilingSchema(BaseModel):
    area: float = Field(description="Area in m²")
    u_value: float = Field(description="U-value in W/(m²·K)")
    type: str = Field(default="ground", description="ground, intermediate, or roof")


class VentilationSchema(BaseModel):
    air_changes_per_hour: float = Field(default=0.5, ge=0, le=10)
    exhaust_rate: float = Field(default=0, ge=0, description="Additional exhaust in m³/h")


class FloorplanSchema(BaseModel):
    walls: List[WallSchema] = []
    windows: List[WindowSchema] = []
    doors: List[DoorSchema] = []
    floor: Optional[FloorCeilingSchema] = None
    ceiling: Optional[FloorCeilingSchema] = None
    ventilation: VentilationSchema = VentilationSchema()
    room_volume: Optional[float] = Field(default=None, description="Room volume in m³")
    thermal_mass: Optional[float] = Field(default=None, description="Thermal mass in kJ/K")


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    floorplan: Optional[FloorplanSchema] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    floorplan: Optional[FloorplanSchema] = None


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    floorplan: Optional[dict]
    schema_version: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
