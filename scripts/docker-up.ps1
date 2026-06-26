param(
  [string]$Image = $env:NODE_IMAGE
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not $Image) {
  $Image = "public.ecr.aws/docker/library/node:22-alpine"
}

Write-Host "Using Docker base image: $Image"
$env:NODE_IMAGE = $Image

docker compose up --build
