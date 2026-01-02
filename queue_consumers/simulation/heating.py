"""
Heating controller for building thermal simulation.
Supports thermostat, fixed power, and schedule heating modes.
"""

from typing import Tuple
from enum import Enum


class HeatingMode(str, Enum):
    NONE = "none"
    THERMOSTAT = "thermostat"
    FIXED_POWER = "fixed_power"
    SCHEDULE = "schedule"


class HeatingController:
    """Controls heating based on configuration with stable on/off behavior"""
    
    def __init__(self, config: dict):
        self.config = config
        self.mode = HeatingMode(config.get("heating_mode", "thermostat"))
        
        # Thermostat state
        self._heating_on = False
        self._last_switch_time = -999  # Minutes since last on/off switch
        
        # Minimum cycle time to prevent rapid switching (in minutes)
        self.min_cycle_minutes = 2
    
    def get_heating_power(self, indoor_temp: float, time_minutes: int) -> Tuple[float, bool]:
        """
        Get heating power for current conditions.
        Returns (power_watts, heating_on_boolean)
        """
        if self.mode == HeatingMode.NONE:
            return 0.0, False
        
        elif self.mode == HeatingMode.THERMOSTAT:
            return self._thermostat_control(indoor_temp, time_minutes)
        
        elif self.mode == HeatingMode.FIXED_POWER:
            return self._fixed_power_control()
        
        elif self.mode == HeatingMode.SCHEDULE:
            return self._schedule_control(time_minutes)
        
        return 0.0, False
    
    def _thermostat_control(self, indoor_temp: float, time_minutes: int) -> Tuple[float, bool]:
        """
        Thermostat control with hysteresis dead-band.
        Uses classic on/off control with dead-band to prevent short-cycling.
        """
        thermostat = self.config.get("thermostat", {})
        setpoint = thermostat.get("setpoint", 20.0)
        hysteresis = thermostat.get("hysteresis", 0.5)  # Total dead-band width
        max_power = thermostat.get("max_power", 3000)
        
        # Dead-band boundaries
        # Heat turns ON when temp drops below (setpoint - hysteresis)
        # Heat turns OFF when temp rises above setpoint
        lower_threshold = setpoint - hysteresis
        upper_threshold = setpoint
        
        # Check if we can switch (prevent rapid cycling)
        time_since_switch = time_minutes - self._last_switch_time
        can_switch = time_since_switch >= self.min_cycle_minutes
        
        # Determine if we should switch
        should_turn_on = indoor_temp < lower_threshold
        should_turn_off = indoor_temp > upper_threshold
        
        if can_switch:
            if should_turn_on and not self._heating_on:
                self._heating_on = True
                self._last_switch_time = time_minutes
            elif should_turn_off and self._heating_on:
                self._heating_on = False
                self._last_switch_time = time_minutes
        
        # Return power
        if self._heating_on:
            return max_power, True
        return 0.0, False
    
    def _fixed_power_control(self) -> Tuple[float, bool]:
        """Fixed power (always on at specified power)"""
        fixed_power = self.config.get("fixed_power", {})
        power = fixed_power.get("power", 2000)
        return power, True
    
    def _schedule_control(self, time_minutes: int) -> Tuple[float, bool]:
        """Schedule-based control (X hours per day starting at specified hour)"""
        schedule = self.config.get("schedule", {})
        hours_per_day = schedule.get("hours_per_day", 8)
        power = schedule.get("power", 2000)
        start_hour = schedule.get("start_hour", 6)
        
        # Convert to hour of day
        hour_of_day = (time_minutes // 60) % 24
        
        # Simple continuous block schedule
        end_hour = (start_hour + int(hours_per_day)) % 24
        
        if start_hour <= end_hour:
            heating_on = start_hour <= hour_of_day < end_hour
        else:
            # Wraps around midnight
            heating_on = hour_of_day >= start_hour or hour_of_day < end_hour
        
        if heating_on:
            return power, True
        return 0.0, False
