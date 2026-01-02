"""
Insights engine for generating improvement suggestions.
"""

from typing import List, Dict, Optional


class InsightsEngine:
    """Generate rule-based improvement suggestions"""
    
    def __init__(self, heat_loss_breakdown: dict, floorplan: dict):
        self.breakdown = heat_loss_breakdown
        self.floorplan = floorplan
        self.total_loss = heat_loss_breakdown.get("total", 0)
    
    def generate_insights(self) -> List[dict]:
        """Generate all relevant insights"""
        insights = []
        
        if self.total_loss <= 0:
            return insights
        
        # Analyze each heat loss component
        insights.extend(self._analyze_windows())
        insights.extend(self._analyze_walls())
        insights.extend(self._analyze_ventilation())
        insights.extend(self._analyze_doors())
        insights.extend(self._analyze_floor_ceiling())
        
        # Sort by potential savings
        insights.sort(key=lambda x: x.get("potential_savings_percent", 0), reverse=True)
        
        return insights[:5]  # Return top 5 insights
    
    def _get_percentage(self, component: str) -> float:
        """Get percentage of total loss for a component"""
        component_loss = self.breakdown.get(component, 0)
        if self.total_loss <= 0:
            return 0
        return (component_loss / self.total_loss) * 100
    
    def _analyze_windows(self) -> List[dict]:
        """Analyze window heat loss"""
        insights = []
        window_pct = self._get_percentage("windows")
        
        if window_pct > 25:
            insights.append({
                "category": "windows",
                "message": f"Windows account for {window_pct:.1f}% of heat loss. Consider upgrading to double or triple glazing (U-value < 1.4 W/m²K).",
                "potential_savings_percent": window_pct * 0.5,
            })
        
        # Check for poor sealing
        windows = self.floorplan.get("windows", [])
        poor_sealing = sum(1 for w in windows if w.get("sealing") == "poor")
        
        if poor_sealing > 0:
            insights.append({
                "category": "windows",
                "message": f"{poor_sealing} window(s) have poor sealing. Weatherstripping can reduce air infiltration significantly.",
                "potential_savings_percent": poor_sealing * 3,
            })
        
        return insights
    
    def _analyze_walls(self) -> List[dict]:
        """Analyze wall heat loss"""
        insights = []
        wall_pct = self._get_percentage("walls")
        
        if wall_pct > 30:
            insights.append({
                "category": "walls",
                "message": f"Walls account for {wall_pct:.1f}% of heat loss. Adding external or internal insulation could significantly reduce this.",
                "potential_savings_percent": wall_pct * 0.6,
            })
        
        # Check for high U-value materials
        walls = self.floorplan.get("walls", [])
        uninsulated = sum(1 for w in walls if w.get("material") in ["concrete", "steel"])
        
        if uninsulated > 0:
            insights.append({
                "category": "walls",
                "message": f"{uninsulated} wall(s) use high-conductivity materials. Consider adding insulation layer.",
                "potential_savings_percent": uninsulated * 5,
            })
        
        return insights
    
    def _analyze_ventilation(self) -> List[dict]:
        """Analyze ventilation heat loss"""
        insights = []
        vent_pct = self._get_percentage("ventilation")
        
        if vent_pct > 20:
            ventilation = self.floorplan.get("ventilation", {})
            ach = ventilation.get("air_changes_per_hour", 0.5)
            
            if ach > 1.0:
                insights.append({
                    "category": "ventilation",
                    "message": f"High ventilation rate ({ach:.1f} ACH) contributes {vent_pct:.1f}% of heat loss. Consider heat recovery ventilation (HRV).",
                    "potential_savings_percent": vent_pct * 0.7,
                })
            else:
                insights.append({
                    "category": "ventilation",
                    "message": f"Air infiltration causes {vent_pct:.1f}% of heat loss. Improve sealing around windows, doors, and other penetrations.",
                    "potential_savings_percent": vent_pct * 0.4,
                })
        
        return insights
    
    def _analyze_doors(self) -> List[dict]:
        """Analyze door heat loss"""
        insights = []
        door_pct = self._get_percentage("doors")
        
        if door_pct > 10:
            insights.append({
                "category": "doors",
                "message": f"Doors account for {door_pct:.1f}% of heat loss. Consider insulated doors or adding weatherstripping.",
                "potential_savings_percent": door_pct * 0.4,
            })
        
        return insights
    
    def _analyze_floor_ceiling(self) -> List[dict]:
        """Analyze floor and ceiling heat loss"""
        insights = []
        
        floor_pct = self._get_percentage("floor")
        ceiling_pct = self._get_percentage("ceiling")
        
        if floor_pct > 15:
            insights.append({
                "category": "floor",
                "message": f"Floor accounts for {floor_pct:.1f}% of heat loss. Consider underfloor insulation.",
                "potential_savings_percent": floor_pct * 0.5,
            })
        
        if ceiling_pct > 20:
            insights.append({
                "category": "ceiling",
                "message": f"Ceiling/roof accounts for {ceiling_pct:.1f}% of heat loss. Loft or roof insulation is highly effective.",
                "potential_savings_percent": ceiling_pct * 0.7,
            })
        
        return insights
