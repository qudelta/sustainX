# Thermal Simulation Platform

A full-stack building thermal simulation platform for architects and sustainability professionals.

## Quick Start

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker-compose up --build
```

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/docs |
| RabbitMQ Management | http://localhost:15672 |
| MinIO Console | http://localhost:9001 |

## Features

- **Single-room floorplan editor** with walls, windows, doors
- **Thermal simulation** with heat loss calculations
- **Multiple heating modes**: thermostat, fixed power, schedule
- **Results visualization**: temperature, energy, heat loss charts
- **PDF report generation** with improvement insights
- **Magic-link authentication** (passwordless)

## Architecture

- **Frontend**: React 18, Vite, Mantine UI, Zustand, Recharts
- **Backend**: FastAPI, SQLAlchemy, MySQL
- **Worker**: RabbitMQ consumer for async simulations
- **Storage**: MinIO for file storage

## Development

All services run in Docker with hot-reload enabled:

```bash
# View logs
docker-compose logs -f backend

# Rebuild single service
docker-compose up --build frontend
```
