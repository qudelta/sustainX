"""
Heat loss calculator for building thermal simulation.
Calculates heat loss through walls, windows, doors, floor, ceiling, and ventilation.
"""

from typing import Dict, Optional
import math

# Material U-values in W/(m²·K)
MATERIAL_U_VALUES = {
    "brick": 1.5,
    "concrete": 3.0,
    "wood": 0.4,
    "glass": 5.0,
    "insulated": 0.3,
    "steel": 50.0,
}

# Sealing air infiltration factors (air changes per hour addition)
SEALING_FACTORS = {
    "poor": 0.5,
    "average": 0.3,
    "good": 0.15,
    "excellent": 0.05,
}

# Air properties
AIR_DENSITY = 1.2  # kg/m³
AIR_SPECIFIC_HEAT = 1005  # J/(kg·K)

# Unit conversion (frontend uses feet, simulation uses meters)
FEET_TO_METERS = 0.3048


class HeatLossCalculator:
    """Calculates heat loss for a single room"""
    
    def __init__(self, floorplan: dict, outdoor_temp: float = 5.0):
        self.floorplan = floorplan
        self.outdoor_temp = outdoor_temp
        self._room_volume: Optional[float] = None
        self._wall_areas: Dict[str, float] = {}
        self._calculate_geometry()
    
    def _calculate_geometry(self):
        """Pre-calculate wall areas and room volume"""
        walls = self.floorplan.get("walls", [])
        
        total_wall_area = 0
        for wall in walls:
            # Wall coordinates are in feet, convert to meters
            length_ft = math.sqrt(
                (wall["x2"] - wall["x1"]) ** 2 + 
                (wall["y2"] - wall["y1"]) ** 2
            )
            length_m = length_ft * FEET_TO_METERS
            
            # Height is also in feet
            height_ft = wall.get("height", 9.0)  # default 9ft
            height_m = height_ft * FEET_TO_METERS
            
            area = length_m * height_m
            self._wall_areas[wall["id"]] = area
            total_wall_area += area
        
        # Estimate room volume if not provided
        floor = self.floorplan.get("floor")
        if self.floorplan.get("room_volume"):
            self._room_volume = self.floorplan["room_volume"]
        elif floor:
            avg_height = 2.8
            if walls:
                avg_height = sum(w.get("height", 2.8) for w in walls) / len(walls)
            self._room_volume = floor["area"] * avg_height
        else:
            self._room_volume = 50.0  # Default 50m³
    
    def get_wall_u_value(self, wall: dict) -> float:
        """Get U-value for a wall"""
        if wall.get("u_value"):
            return wall["u_value"]
        material = wall.get("material", "brick")
        return MATERIAL_U_VALUES.get(material, 1.5)
    
    def calculate_wall_loss(self, indoor_temp: float) -> float:
        """Calculate heat loss through walls in Watts"""
        walls = self.floorplan.get("walls", [])
        windows = self.floorplan.get("windows", [])
        doors = self.floorplan.get("doors", [])
        
        # Calculate window/door areas per wall (convert from ft² to m²)
        wall_openings = {}
        for window in windows:
            wall_id = window.get("wall_id")
            width_m = window.get("width", 3) * FEET_TO_METERS
            height_m = window.get("height", 4) * FEET_TO_METERS
            opening_area = width_m * height_m
            wall_openings[wall_id] = wall_openings.get(wall_id, 0) + opening_area
        
        for door in doors:
            wall_id = door.get("wall_id")
            width_m = door.get("width", 3) * FEET_TO_METERS
            height_m = door.get("height", 7) * FEET_TO_METERS
            opening_area = width_m * height_m
            wall_openings[wall_id] = wall_openings.get(wall_id, 0) + opening_area
        
        delta_t = indoor_temp - self.outdoor_temp
        total_loss = 0
        
        for wall in walls:
            wall_area = self._wall_areas.get(wall["id"], 0)
            opening_area = wall_openings.get(wall["id"], 0)
            net_area = max(0, wall_area - opening_area)
            
            u_value = self.get_wall_u_value(wall)
            total_loss += u_value * net_area * delta_t
        
        return total_loss
    
    def calculate_window_loss(self, indoor_temp: float) -> float:
        """Calculate heat loss through windows in Watts"""
        windows = self.floorplan.get("windows", [])
        delta_t = indoor_temp - self.outdoor_temp
        total_loss = 0
        
        for window in windows:
            # Convert feet to meters
            width_m = window.get("width", 3) * FEET_TO_METERS
            height_m = window.get("height", 4) * FEET_TO_METERS
            area = width_m * height_m
            u_value = window.get("u_value", 2.8)
            total_loss += u_value * area * delta_t
        
        return total_loss
    
    def calculate_door_loss(self, indoor_temp: float) -> float:
        """Calculate heat loss through doors in Watts"""
        doors = self.floorplan.get("doors", [])
        delta_t = indoor_temp - self.outdoor_temp
        total_loss = 0
        
        for door in doors:
            # Convert feet to meters
            width_m = door.get("width", 3) * FEET_TO_METERS
            height_m = door.get("height", 7) * FEET_TO_METERS
            area = width_m * height_m
            u_value = door.get("u_value", 2.0)
            total_loss += u_value * area * delta_t
        
        return total_loss
    
    def calculate_floor_loss(self, indoor_temp: float) -> float:
        """Calculate heat loss through floor in Watts"""
        floor = self.floorplan.get("floor")
        if not floor:
            return 0
        
        delta_t = indoor_temp - self.outdoor_temp
        # Ground floors have lower delta_t (ground is warmer than air)
        if floor.get("type") == "ground":
            delta_t *= 0.5
        
        return floor.get("u_value", 0.5) * floor.get("area", 20) * delta_t
    
    def calculate_ceiling_loss(self, indoor_temp: float) -> float:
        """Calculate heat loss through ceiling in Watts"""
        ceiling = self.floorplan.get("ceiling")
        if not ceiling:
            return 0
        
        delta_t = indoor_temp - self.outdoor_temp
        return ceiling.get("u_value", 0.3) * ceiling.get("area", 20) * delta_t
    
    def calculate_ventilation_loss(self, indoor_temp: float) -> float:
        """Calculate heat loss through ventilation in Watts"""
        ventilation = self.floorplan.get("ventilation", {})
        ach = ventilation.get("air_changes_per_hour", 0.5)
        exhaust = ventilation.get("exhaust_rate", 0)  # m³/h
        
        # Add infiltration from window/door sealing
        windows = self.floorplan.get("windows", [])
        doors = self.floorplan.get("doors", [])
        
        for window in windows:
            sealing = window.get("sealing", "average")
            ach += SEALING_FACTORS.get(sealing, 0.3)
        
        for door in doors:
            sealing = door.get("sealing", "average")
            ach += SEALING_FACTORS.get(sealing, 0.3)
        
        # Total air flow rate (m³/h)
        volume_flow = ach * self._room_volume + exhaust
        
        # Convert to m³/s
        volume_flow_s = volume_flow / 3600
        
        # Heat loss = ρ * V * c * ΔT
        delta_t = indoor_temp - self.outdoor_temp
        return AIR_DENSITY * volume_flow_s * AIR_SPECIFIC_HEAT * delta_t
    
    def calculate_total_loss(self, indoor_temp: float) -> dict:
        """Calculate total heat loss and breakdown"""
        breakdown = {
            "walls": self.calculate_wall_loss(indoor_temp),
            "windows": self.calculate_window_loss(indoor_temp),
            "doors": self.calculate_door_loss(indoor_temp),
            "floor": self.calculate_floor_loss(indoor_temp),
            "ceiling": self.calculate_ceiling_loss(indoor_temp),
            "ventilation": self.calculate_ventilation_loss(indoor_temp),
        }
        breakdown["total"] = sum(breakdown.values())
        return breakdown
    
    @property
    def room_volume(self) -> float:
        return self._room_volume
