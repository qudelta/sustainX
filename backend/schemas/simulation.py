from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class HeatingMode(str, Enum):
    NONE = "none"
    THERMOSTAT = "thermostat"
    FIXED_POWER = "fixed_power"
    SCHEDULE = "schedule"


class ThermostatConfig(BaseModel):
    setpoint: float = Field(
        default=20.0, description="Target temperature in °C")
    hysteresis: float = Field(
        default=0.5, ge=0, description="Temperature band in °C")
    max_power: float = Field(
        default=3000, ge=0, description="Max heating power in W")


class FixedPowerConfig(BaseModel):
    power: float = Field(ge=0, description="Heating power in W")


class ScheduleConfig(BaseModel):
    hours_per_day: float = Field(
        ge=0, le=24, description="Hours of heating per day")
    power: float = Field(ge=0, description="Heating power when on in W")
    start_hour: int = Field(default=6, ge=0, le=23,
                            description="Start hour (0-23)")


class SimulationConfigSchema(BaseModel):
    # Simulation duration
    duration_hours: int = Field(
        default=24, ge=1, le=8760, description="Simulation duration in hours")
    timestep_minutes: int = Field(
        default=15, ge=1, le=60, description="Timestep in minutes")

    # Environmental conditions
    outdoor_temperature: float = Field(
        default=5.0, description="Outdoor temperature in °C")
    initial_indoor_temp: float = Field(
        default=18.0, description="Initial indoor temperature in °C")

    # Heating configuration
    heating_mode: HeatingMode = HeatingMode.THERMOSTAT
    thermostat: Optional[ThermostatConfig] = None
    fixed_power: Optional[FixedPowerConfig] = None
    schedule: Optional[ScheduleConfig] = None


class SimulationJobCreate(BaseModel):
    project_id: str
    config: SimulationConfigSchema


class HeatLossBreakdown(BaseModel):
    walls: float
    windows: float
    doors: float
    floor: float
    ceiling: float
    ventilation: float
    total: float


class TimeSeriesPoint(BaseModel):
    time_minutes: int
    indoor_temp: float
    heating_on: bool
    outdoor_temp: float
    heating_power: float


class InsightItem(BaseModel):
    category: str
    message: str
    potential_savings_percent: Optional[float] = None


class SimulationJobResponse(BaseModel):
    id: str
    project_id: str
    status: str
    config: dict
    error_message: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class SimulationResultResponse(BaseModel):
    id: str
    job_id: str
    time_series: List[TimeSeriesPoint]
    total_energy_kwh: float
    heat_loss_breakdown: dict
    insights: Optional[List[dict]]
    report_file_key: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
