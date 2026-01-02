from sqlalchemy import Column, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import JSON
from datetime import datetime
import uuid

from database import Base


class SimulationResult(Base):
    __tablename__ = "simulation_results"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("simulation_jobs.id"), nullable=False, unique=True)
    
    # Time series data
    time_series = Column(JSON, nullable=False)  # [{time, indoor_temp, heating_on}]
    
    # Energy totals
    total_energy_kwh = Column(Float, nullable=False)
    
    # Heat loss breakdown
    heat_loss_breakdown = Column(JSON, nullable=False)  # {walls, windows, doors, floor, ceiling, ventilation}
    
    # Insights and suggestions
    insights = Column(JSON, nullable=True)
    
    # PDF report file key in MinIO
    report_file_key = Column(String(512), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    job = relationship("SimulationJob", back_populates="result")
