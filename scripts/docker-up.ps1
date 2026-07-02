param(
  [string]$Image = $env:NODE_IMAGE
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if ($Image) {
  Write-Host "Using Docker base image: $Image"
  $env:NODE_IMAGE = $Image
} else {
  Write-Host "Using Docker base image from .env or docker-compose.yml default"
}

docker compose up --build
