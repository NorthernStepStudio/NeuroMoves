param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,

    [string]$Region = "us-central1",
    [string]$ServiceName = "neuromoves-backend",
    [string]$EnvFile = "cloud-run.env.yaml",
    [string]$DatabaseUrlSecret = "neuromoves-database-url",
    [string]$GroqApiKeySecret = "",
    [switch]$NoAllowUnauthenticated
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    throw "gcloud is required. Install the Google Cloud CLI first."
}

if (-not (Test-Path "Dockerfile")) {
    throw "Run this script from the NeuroMoves backend directory so Cloud Run can build the Dockerfile."
}

$secretMappings = [System.Collections.Generic.List[string]]::new()
$secretMappings.Add("DATABASE_URL=$DatabaseUrlSecret:latest")

if ($GroqApiKeySecret) {
    $secretMappings.Add("GROQ_API_KEY=$GroqApiKeySecret:latest")
}

$deployArgs = [System.Collections.Generic.List[string]]::new()
$deployArgs.AddRange(@(
        "run", "deploy", $ServiceName,
        "--source", ".",
        "--project", $ProjectId,
        "--region", $Region,
        "--platform", "managed",
        "--port", "8080",
        "--cpu", "1",
        "--memory", "1Gi",
        "--set-secrets", ($secretMappings -join ",")
    ))

if (Test-Path $EnvFile) {
    $deployArgs.AddRange(@("--env-vars-file", $EnvFile))
}

if (-not $NoAllowUnauthenticated) {
    $deployArgs.Add("--allow-unauthenticated")
}

Write-Host "Deploying Cloud Run service $ServiceName to project $ProjectId ($Region)..."
& gcloud @deployArgs

if ($LASTEXITCODE -ne 0) {
    throw "Cloud Run deploy failed."
}

Write-Host "Done."
