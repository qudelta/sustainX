"""
Main simulation engine for building thermal simulation.
Runs iterative timestep simulation with high-frequency internal steps
for numerical stability.
"""

from typing import List, Dict
from simulation.heat_loss import HeatLossCalculator
from simulation.heating import HeatingController
from simulation.insights import InsightsEngine

# Thermal properties
AIR_DENSITY = 1.2  # kg/m³
AIR_SPECIFIC_HEAT = 1005  # J/(kg·K)

# Building thermal mass multiplier (accounts for walls, furniture, etc.)
# Typical buildings have 5-10x the thermal mass of just air
THERMAL_MASS_MULTIPLIER = 8.0

# Simulation parameters
INTERNAL_TIMESTEP_SECONDS = 30  # 30-second internal timesteps for stability
DEFAULT_RECORDING_INTERVAL_MINUTES = 5


class SimulationEngine:
    """Main simulation engine with stable thermal physics"""
    
    def __init__(self, floorplan: dict, config: dict):
        self.floorplan = floorplan
        self.config = config
        
        self.outdoor_temp = config.get("outdoor_temperature", 5.0)
        self.initial_temp = config.get("initial_indoor_temp", 18.0)
        self.duration_hours = config.get("duration_hours", 24)
        self.recording_interval_minutes = config.get("timestep_minutes", DEFAULT_RECORDING_INTERVAL_MINUTES)
        
        self.heat_loss_calc = HeatLossCalculator(floorplan, self.outdoor_temp)
        self.heating_ctrl = HeatingController(config)
        
        # Calculate thermal capacity
        room_volume = self.heat_loss_calc.room_volume
        if room_volume and room_volume > 0:
            # Air thermal mass with building multiplier
            air_thermal_mass = room_volume * AIR_DENSITY * AIR_SPECIFIC_HEAT
            self.thermal_capacity = air_thermal_mass * THERMAL_MASS_MULTIPLIER
        else:
            # Fallback: assume 50m³ room
            self.thermal_capacity = 50 * AIR_DENSITY * AIR_SPECIFIC_HEAT * THERMAL_MASS_MULTIPLIER
        
        # Allow config override
        if floorplan.get("thermal_mass"):
            self.thermal_capacity = floorplan["thermal_mass"] * 1000  # kJ/K to J/K
    
    def run(self) -> dict:
        """Run the simulation and return results"""
        # Calculate total simulation time in seconds
        total_seconds = self.duration_hours * 3600
        recording_interval_seconds = int(self.recording_interval_minutes * 60)
        
        time_series = []
        total_energy_wh = 0
        cumulative_energy_wh = 0
        
        heat_loss_totals = {
            "walls": 0,
            "windows": 0,
            "doors": 0,
            "floor": 0,
            "ceiling": 0,
            "ventilation": 0,
            "total": 0,
        }
        
        indoor_temp = self.initial_temp
        current_second = 0
        last_recording_second = -recording_interval_seconds  # Record at t=0
        
        # Variables for averaging within recording intervals
        temp_sum = 0
        power_sum = 0
        energy_this_interval_wh = 0
        heating_on_count = 0
        samples_in_interval = 0
        
        while current_second < total_seconds:
            # Calculate heat loss at current temperature
            loss_breakdown = self.heat_loss_calc.calculate_total_loss(indoor_temp)
            total_loss = loss_breakdown["total"]
            
            # Get heating power from controller
            time_minutes = current_second // 60
            heating_power, heating_on = self.heating_ctrl.get_heating_power(indoor_temp, time_minutes)
            
            # Physics: calculate temperature change
            # dT = (Q_in - Q_out) * dt / C
            net_power = heating_power - total_loss  # Watts
            temp_change = (net_power * INTERNAL_TIMESTEP_SECONDS) / self.thermal_capacity
            
            # Cumulative physics tracking
            step_energy_wh = heating_power * (INTERNAL_TIMESTEP_SECONDS / 3600)
            energy_this_interval_wh += step_energy_wh
            cumulative_energy_wh += step_energy_wh
            total_energy_wh += step_energy_wh
            
            # Accumulate for averaging
            temp_sum += indoor_temp
            power_sum += heating_power
            if heating_on:
                heating_on_count += 1
            samples_in_interval += 1
            
            # Accumulate heat loss totals
            for key in heat_loss_totals:
                heat_loss_totals[key] += loss_breakdown.get(key, 0) * INTERNAL_TIMESTEP_SECONDS / 3600
            
            # Record data point at intervals
            if current_second - last_recording_second >= recording_interval_seconds:
                avg_temp = temp_sum / samples_in_interval if samples_in_interval > 0 else indoor_temp
                avg_power = power_sum / samples_in_interval if samples_in_interval > 0 else heating_power
                heating_ratio = heating_on_count / samples_in_interval if samples_in_interval > 0 else 0
                
                time_series.append({
                    "time_minutes": current_second // 60,
                    "indoor_temp": round(avg_temp, 2),
                    "heating_on": heating_ratio > 0.0,  # Any heating in interval counts as On for visualization
                    "heating_power": round(avg_power, 1),
                    "energy_wh": round(energy_this_interval_wh, 3),
                    "cumulative_energy_wh": round(cumulative_energy_wh, 3),
                })
                
                # Reset accumulators
                temp_sum = 0
                power_sum = 0
                energy_this_interval_wh = 0
                heating_on_count = 0
                samples_in_interval = 0
                last_recording_second = current_second
            
            # Apply temperature change
            indoor_temp += temp_change
            
            # Safety bounds
            indoor_temp = max(-20, min(60, indoor_temp))
            
            # Advance time
            current_second += INTERNAL_TIMESTEP_SECONDS
        
        # Normalize heat loss totals
        for key in heat_loss_totals:
            heat_loss_totals[key] = round(heat_loss_totals[key], 2)
        
        # Generate insights using average temperature
        if time_series:
            avg_temp = sum(p["indoor_temp"] for p in time_series) / len(time_series)
            avg_breakdown = self.heat_loss_calc.calculate_total_loss(avg_temp)
            insights_engine = InsightsEngine(avg_breakdown, self.floorplan)
            insights = insights_engine.generate_insights()
        else:
            insights = []
        
        return {
            "time_series": time_series,
            "total_energy_kwh": round(total_energy_wh / 1000, 3),
            "heat_loss_breakdown": heat_loss_totals,
            "insights": insights,
        }
