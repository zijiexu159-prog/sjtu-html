@echo off
setlocal
cd /d "%~dp0.."
if "%NODE_IMAGE%"=="" set "NODE_IMAGE=public.ecr.aws/docker/library/node:22-alpine"
echo Using Docker base image: %NODE_IMAGE%
docker compose up --build
