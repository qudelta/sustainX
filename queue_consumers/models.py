from sqlalchemy import Column, String, DateTime, Text, Enum
from sqlalchemy.dialects.mysql import JSON
from datetime import datetime
import uuid
import enum

from database import Base


class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class SimulationJob(Base):
    __tablename__ = "simulation_jobs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), nullable=False, index=True)  # No FK - backend manages integrity
    
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    config = Column(JSON, nullable=False)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
