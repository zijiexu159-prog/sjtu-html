@echo off
setlocal
cd /d "%~dp0.."
if "%NODE_IMAGE%"=="" (
  echo Using Docker base image from .env or docker-compose.yml default
) else (
  echo Using Docker base image: %NODE_IMAGE%
)
docker compose up --build
