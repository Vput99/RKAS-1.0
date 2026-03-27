# Script to run LiteLLM Proxy locally with the project configuration
# Run this in a separate terminal: ./run-proxy.ps1

$env:GEMINI_API_KEY = (Get-Content .env | Select-String "GEMINI_API_KEY=").ToString().Split("=")[1].Trim()
$env:GROQ_API_KEY = (Get-Content .env | Select-String "GROQ_API_KEY=").ToString().Split("=")[1].Trim()
$env:DEEPSEEK_API_KEY = (Get-Content .env | Select-String "DEEPSEEK_API_KEY=").ToString().Split("=")[1].Trim()

Write-Host "Starting LiteLLM Proxy on http://localhost:4000..." -ForegroundColor Cyan
python -m litellm --config litellm/config.yaml --port 4000
