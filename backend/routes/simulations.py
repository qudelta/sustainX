from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models.user import User
from models.project import Project
from models.simulation_job import SimulationJob, JobStatus
from models.simulation_result import SimulationResult
from schemas.simulation import SimulationJobCreate, SimulationJobResponse, SimulationResultResponse
from routes.dependencies import get_current_user
from services.queue_service import QueueService
from services.storage_service import StorageService

router = APIRouter(prefix="/simulations", tags=["Simulations"])


@router.post("", response_model=SimulationJobResponse, status_code=status.HTTP_201_CREATED)
def create_simulation_job(
    job_data: SimulationJobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create and queue a new simulation job"""
    # Verify project ownership
    project = db.query(Project).filter(
        Project.id == job_data.project_id,
        Project.user_id == current_user.id,
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    if not project.floorplan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project has no floorplan defined",
        )
    
    # Create job
    job = SimulationJob(
        project_id=project.id,
        config=job_data.config.model_dump(),
        status=JobStatus.PENDING,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Publish to queue
    if QueueService.publish_simulation_job(job.id):
        job.status = JobStatus.QUEUED
        db.commit()
        db.refresh(job)
    else:
        job.status = JobStatus.FAILED
        job.error_message = "Failed to queue simulation"
        db.commit()
        db.refresh(job)
    
    return job


@router.get("/project/{project_id}", response_model=List[SimulationJobResponse])
def list_project_simulations(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all simulation jobs for a project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    jobs = db.query(SimulationJob).filter(
        SimulationJob.project_id == project_id
    ).order_by(SimulationJob.created_at.desc()).all()
    
    return jobs


@router.get("/{job_id}", response_model=SimulationJobResponse)
def get_simulation_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get simulation job status"""
    job = db.query(SimulationJob).join(Project).filter(
        SimulationJob.id == job_id,
        Project.user_id == current_user.id,
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation job not found",
        )
    
    return job


@router.get("/{job_id}/result", response_model=SimulationResultResponse)
def get_simulation_result(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get simulation results"""
    job = db.query(SimulationJob).join(Project).filter(
        SimulationJob.id == job_id,
        Project.user_id == current_user.id,
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation job not found",
        )
    
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Simulation is not completed. Status: {job.status.value}",
        )
    
    result = db.query(SimulationResult).filter(
        SimulationResult.job_id == job_id
    ).first()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation result not found",
        )
    
    return result


@router.get("/{job_id}/report-url")
def get_report_download_url(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get presigned URL for PDF report download"""
    job = db.query(SimulationJob).join(Project).filter(
        SimulationJob.id == job_id,
        Project.user_id == current_user.id,
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation job not found",
        )
    
    result = db.query(SimulationResult).filter(
        SimulationResult.job_id == job_id
    ).first()
    
    if not result or not result.report_file_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not available",
        )
    
    url = StorageService.get_presigned_url(result.report_file_key)
    
    if not url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL",
        )
    
    return {"download_url": url}
