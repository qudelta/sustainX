"""
Heat loss calculator for building thermal simulation.
Calculates heat loss through walls, windows, doors, floor, ceiling, and ventilation.
Uses thermal conductivity (k-values) and thickness to calculate proper U-values.
"""

from typing import Dict, Optional
import math

# Thermal conductivity k-values in W/(m·K) - material intrinsic property
MATERIAL_K_VALUES = {
    "brick": 0.8,
    "concrete": 1.4,
    "wood": 0.14,
    "insulated": 0.04,  # Insulated wall with foam/fiberglass
    "glass": 1.0,
    "steel": 50.0,
}

WALL_INSULATION_K_VALUES = {
    "wood_panel": 0.13
} 
WALL_INSULATION_AVG_THICKNESS = { #values are in meters
    "wood_panel": 0.02    
}

# Window U-values in W/(m²·K) - pre-calculated for standard assemblies
WINDOW_U_VALUES = {
    "single_glazed": 5.8,
    "double_glazed": 2.8,
    "triple_glazed": 1.8,
    "low_e": 1.4,
}

# Door U-values in W/(m²·K) - pre-calculated for standard assemblies
DOOR_U_VALUES = {
    "wood": 2.0,
    "wood_hollow": 3.5,
    "steel": 3.0,
    "fiberglass": 1.8,
    "glass": 5.0,
}

# Surface resistance in m²·K/W (air films)
R_INSIDE = 0.13   # Interior surface resistance
R_OUTSIDE = 0.04  # Exterior surface resistance

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
INCHES_TO_METERS = 0.0254


class HeatLossCalculator:
    """Calculates heat loss for a single room with proper thermal physics"""
    
    def __init__(self, floorplan: dict, outdoor_temp: float = 5.0):
        self.floorplan = floorplan
        self.outdoor_temp = outdoor_temp
        self._room_volume: Optional[float] = None
        self._wall_data: Dict[str, dict] = {}  # Store wall areas and U-values
        self._calculate_geometry()
    
    def _calculate_u_value(self, k_value: float, thickness_m: float, wall_insulation_k: float, wall_insulation_thickness_m: float) -> float:
        """
        Calculate U-value from thermal conductivity and thickness.
        U = 1 / R_total
        R_total = R_inside + (thickness / k) + R_outside
        """
        if thickness_m <= 0 or k_value <= 0:
            # Fallback to typical brick wall
            thickness_m = 0.2
            k_value = 0.8
        
        R_material = thickness_m / k_value
        R_insulation = 0
        if wall_insulation_k > 0 and wall_insulation_thickness_m > 0:
            R_insulation = wall_insulation_thickness_m / wall_insulation_k
        R_total = R_INSIDE + R_material + R_insulation + R_OUTSIDE
        return 1.0 / R_total
    
    def _calculate_geometry(self):
        """Pre-calculate wall areas, U-values, and room volume"""
        walls = self.floorplan.get("walls", [])
        
        for wall in walls:
            # Wall coordinates are in feet, convert to meters
            length_ft = math.sqrt(
                (wall["x2"] - wall["x1"]) ** 2 + 
                (wall["y2"] - wall["y1"]) ** 2
            )
            length_m = length_ft * FEET_TO_METERS
            
            # Height is in feet
            height_ft = wall.get("height", 9.0)
            height_m = height_ft * FEET_TO_METERS
            
            # Thickness is stored in feet, convert to meters
            thickness_ft = wall.get("thickness", 8/12)  # default 8 inches
            thickness_m = thickness_ft * FEET_TO_METERS
            
            # Get material k-value
            material = wall.get("material", "brick")
            k_value = MATERIAL_K_VALUES.get(material, 0.8)

            # Get k-value of material used for wall insulation (e.g. wood planks for wood paneling)
            # and thickness
            wall_insulation_material = wall.get("wall_insulation_material", "none")
            wall_insulation_k = WALL_INSULATION_K_VALUES.get(wall_insulation_material, 0.0)
            wall_insulation_thickness_m = WALL_INSULATION_AVG_THICKNESS.get(wall_insulation_material, 0.0)
            
            # Calculate U-value
            u_value = self._calculate_u_value(k_value, thickness_m, wall_insulation_k, wall_insulation_thickness_m)
            
            # Store wall data
            self._wall_data[wall["id"]] = {
                "area": length_m * height_m,
                "u_value": u_value,
                "thickness_m": thickness_m,
            }
        
        # Estimate room volume from floor area
        floor = self.floorplan.get("floor")
        if self.floorplan.get("room_volume"):
            self._room_volume = self.floorplan["room_volume"]
        elif floor and floor.get("area"):
            avg_height = 2.7  # meters
            if walls:
                avg_height = sum(w.get("height", 9) for w in walls) / len(walls) * FEET_TO_METERS
            self._room_volume = floor["area"] * avg_height
        else:
            self._room_volume = 50.0  # Default 50m³
    
    def calculate_wall_loss(self, indoor_temp: float) -> float:
        """
        Calculate heat loss through walls in Watts.
        Accounts for net wall area (total - windows - doors).
        """
        walls = self.floorplan.get("walls", [])
        windows = self.floorplan.get("windows", [])
        doors = self.floorplan.get("doors", [])
        
        # Calculate window/door areas per wall (in m²)
        wall_openings = {}
        for window in windows:
            wall_id = window.get("wall_id")
            width_m = window.get("width", 4) * FEET_TO_METERS
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
            wall_data = self._wall_data.get(wall["id"], {})
            wall_area = wall_data.get("area", 0)
            u_value = wall_data.get("u_value", 1.5)
            
            opening_area = wall_openings.get(wall["id"], 0)
            net_area = max(0, wall_area - opening_area)
            
            total_loss += u_value * net_area * delta_t
        
        return total_loss
    
    def calculate_window_loss(self, indoor_temp: float) -> float:
        """Calculate heat loss through windows in Watts"""
        windows = self.floorplan.get("windows", [])
        delta_t = indoor_temp - self.outdoor_temp
        total_loss = 0
        
        for window in windows:
            width_m = window.get("width", 4) * FEET_TO_METERS
            height_m = window.get("height", 4) * FEET_TO_METERS
            area = width_m * height_m
            
            # Get U-value from glass type
            glass_type = window.get("material", "double_glazed")
            u_value = WINDOW_U_VALUES.get(glass_type, 2.8)
            
            # Override with explicit U-value if provided
            if window.get("u_value"):
                u_value = window["u_value"]
            
            total_loss += u_value * area * delta_t
        
        return total_loss
    
    def calculate_door_loss(self, indoor_temp: float) -> float:
        """Calculate heat loss through doors in Watts"""
        doors = self.floorplan.get("doors", [])
        delta_t = indoor_temp - self.outdoor_temp
        total_loss = 0
        
        for door in doors:
            width_m = door.get("width", 3) * FEET_TO_METERS
            height_m = door.get("height", 7) * FEET_TO_METERS
            area = width_m * height_m
            
            # Get U-value from door material
            door_material = door.get("material", "wood")
            u_value = DOOR_U_VALUES.get(door_material, 2.0)
            
            # Override with explicit U-value if provided
            if door.get("u_value"):
                u_value = door["u_value"]
            
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
        
        u_value = floor.get("u_value", 0.5)
        area = floor.get("area", 20)
        
        return u_value * area * delta_t
    
    def calculate_ceiling_loss(self, indoor_temp: float) -> float:
        """Calculate heat loss through ceiling in Watts"""
        ceiling = self.floorplan.get("ceiling")
        if not ceiling:
            return 0
        
        delta_t = indoor_temp - self.outdoor_temp
        u_value = ceiling.get("u_value", 0.3)
        area = ceiling.get("area", 20)
        
        return u_value * area * delta_t
    
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
