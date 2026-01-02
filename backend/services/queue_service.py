import json
import pika
from pika.exceptions import AMQPConnectionError, AMQPChannelError
from typing import Optional

from config import get_settings

settings = get_settings()


class QueueService:
    _connection: Optional[pika.BlockingConnection] = None
    _channel: Optional[pika.adapters.blocking_connection.BlockingChannel] = None
    
    @classmethod
    def _reset_connection(cls):
        """Reset connection state"""
        cls._channel = None
        cls._connection = None
    
    @classmethod
    def _is_connected(cls) -> bool:
        """Check if connection is alive"""
        try:
            return (
                cls._connection is not None and 
                cls._connection.is_open and
                cls._channel is not None and 
                cls._channel.is_open
            )
        except Exception:
            return False
    
    @classmethod
    def _connect(cls):
        """Establish connection to RabbitMQ"""
        cls._reset_connection()
        params = pika.URLParameters(settings.rabbitmq_url)
        params.heartbeat = 600  # 10 minute heartbeat
        params.blocked_connection_timeout = 300
        cls._connection = pika.BlockingConnection(params)
        cls._channel = cls._connection.channel()
        cls._channel.queue_declare(queue=settings.simulation_queue, durable=True)
    
    @classmethod
    def get_channel(cls) -> pika.adapters.blocking_connection.BlockingChannel:
        """Get channel, reconnecting if needed"""
        if not cls._is_connected():
            cls._connect()
        return cls._channel
    
    @classmethod
    def publish_simulation_job(cls, job_id: str, max_retries: int = 3) -> bool:
        """Publish job with retry logic"""
        for attempt in range(max_retries):
            try:
                channel = cls.get_channel()
                message = json.dumps({"job_id": job_id})
                
                channel.basic_publish(
                    exchange="",
                    routing_key=settings.simulation_queue,
                    body=message,
                    properties=pika.BasicProperties(
                        delivery_mode=2,
                        content_type="application/json",
                    )
                )
                return True
            except (AMQPConnectionError, AMQPChannelError, Exception) as e:
                print(f"Publish attempt {attempt + 1} failed: {e}")
                cls._reset_connection()
                if attempt == max_retries - 1:
                    print(f"Failed to publish job after {max_retries} attempts")
                    return False
        return False
    
    @classmethod
    def close(cls):
        """Close connections"""
        try:
            if cls._channel and cls._channel.is_open:
                cls._channel.close()
            if cls._connection and cls._connection.is_open:
                cls._connection.close()
        except Exception:
            pass
        cls._reset_connection()
