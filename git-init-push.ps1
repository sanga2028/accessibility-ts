# Run this script from the repository root (c:\Users\ADMIN\accessibility-ts)
# It initializes a Git repository, commits the current files, and pushes to GitHub.

Set-Location -Path $PSScriptRoot

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error 'Git is not installed or not available in this shell.'
    return
}

if (-not (Test-Path .git)) {
    git init
}

git add .
git commit -m "Initial project commit"

git remote remove origin -ErrorAction SilentlyContinue
git remote add origin https://github.com/sanga2028/playwright-cucumber-accessibility.git

git branch -M main
git push -u origin main
