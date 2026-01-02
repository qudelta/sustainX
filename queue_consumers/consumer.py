"""
RabbitMQ consumer for processing simulation jobs.
"""

import json
import time
from datetime import datetime

import pika
from sqlalchemy import text

from config import get_settings
from database import SessionLocal, engine
from models import SimulationJob, JobStatus
from simulation.engine import SimulationEngine

settings = get_settings()


def wait_for_services():
    """Wait for RabbitMQ and MySQL to be ready"""
    print("Waiting for services to be ready...")
    
    # Wait for database
    for i in range(30):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("Database is ready")
            break
        except Exception as e:
            print(f"Waiting for database... ({i+1}/30)")
            time.sleep(2)
    else:
        raise Exception("Database not ready after 60 seconds")
    
    # Wait for RabbitMQ
    for i in range(30):
        try:
            params = pika.URLParameters(settings.rabbitmq_url)
            connection = pika.BlockingConnection(params)
            connection.close()
            print("RabbitMQ is ready")
            break
        except Exception as e:
            print(f"Waiting for RabbitMQ... ({i+1}/30)")
            time.sleep(2)
    else:
        raise Exception("RabbitMQ not ready after 60 seconds")


def get_project_floorplan(db, project_id: str) -> dict:
    """Get floorplan from project"""
    result = db.execute(
        text("SELECT floorplan FROM projects WHERE id = :id"),
        {"id": project_id}
    ).fetchone()
    
    if result and result[0]:
        return json.loads(result[0]) if isinstance(result[0], str) else result[0]
    return None


def save_result(db, job_id: str, result: dict):
    """Save simulation result to database"""
    import uuid
    
    db.execute(
        text("""
            INSERT INTO simulation_results 
            (id, job_id, time_series, total_energy_kwh, heat_loss_breakdown, insights, created_at)
            VALUES (:id, :job_id, :time_series, :total_energy_kwh, :heat_loss_breakdown, :insights, :created_at)
        """),
        {
            "id": str(uuid.uuid4()),
            "job_id": job_id,
            "time_series": json.dumps(result["time_series"]),
            "total_energy_kwh": result["total_energy_kwh"],
            "heat_loss_breakdown": json.dumps(result["heat_loss_breakdown"]),
            "insights": json.dumps(result["insights"]),
            "created_at": datetime.utcnow(),
        }
    )
    db.commit()


def process_job(job_id: str):
    """Process a simulation job"""
    db = SessionLocal()
    
    try:
        # Get job
        job = db.query(SimulationJob).filter(SimulationJob.id == job_id).first()
        
        if not job:
            print(f"Job {job_id} not found")
            return
        
        if job.status not in [JobStatus.PENDING, JobStatus.QUEUED]:
            print(f"Job {job_id} already processed (status: {job.status})")
            return
        
        # Update status to RUNNING
        job.status = JobStatus.RUNNING
        job.started_at = datetime.utcnow()
        db.commit()
        
        print(f"Processing job {job_id}")
        
        # Get floorplan
        floorplan = get_project_floorplan(db, job.project_id)
        
        if not floorplan:
            job.status = JobStatus.FAILED
            job.error_message = "Project has no floorplan"
            job.completed_at = datetime.utcnow()
            db.commit()
            return
        
        # Parse config
        config = job.config if isinstance(job.config, dict) else json.loads(job.config)
        
        # Run simulation
        engine = SimulationEngine(floorplan, config)
        result = engine.run()
        
        # Save result
        save_result(db, job_id, result)
        
        # Update job status
        job.status = JobStatus.COMPLETED
        job.completed_at = datetime.utcnow()
        db.commit()
        
        print(f"Job {job_id} completed successfully")
        
    except Exception as e:
        print(f"Job {job_id} failed: {e}")
        
        try:
            job = db.query(SimulationJob).filter(SimulationJob.id == job_id).first()
            if job:
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                job.completed_at = datetime.utcnow()
                db.commit()
        except:
            pass
    
    finally:
        db.close()


def callback(ch, method, properties, body):
    """RabbitMQ message callback"""
    try:
        message = json.loads(body)
        job_id = message.get("job_id")
        
        if job_id:
            process_job(job_id)
        
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
    except Exception as e:
        print(f"Error processing message: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def main():
    """Main consumer loop"""
    wait_for_services()
    
    print(f"Connecting to RabbitMQ...")
    params = pika.URLParameters(settings.rabbitmq_url)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    
    # Declare queue
    channel.queue_declare(queue=settings.simulation_queue, durable=True)
    
    # Set prefetch to 1 for fair dispatch
    channel.basic_qos(prefetch_count=1)
    
    # Start consuming
    channel.basic_consume(queue=settings.simulation_queue, on_message_callback=callback)
    
    print(f"Consumer started. Waiting for jobs on queue: {settings.simulation_queue}")
    
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        print("Shutting down consumer...")
        channel.stop_consuming()
    
    connection.close()


if __name__ == "__main__":
    main()
