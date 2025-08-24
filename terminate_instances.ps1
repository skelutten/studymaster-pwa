# terminate_instances.ps1
# Script to find and terminate running instances of the StudyMaster PWA app

# Define the process name to look for
$processName = "node"

# Get the current directory (assumed to be the project root)
$currentDir = Get-Location

# Find all running instances of the process that are in the project directory
$processes = Get-Process -Name $processName -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like "*studymaster-pwa*" }

# Check if any instances are running
if ($processes) {
    Write-Host "Found $($processes.Count) running instances of $processName related to StudyMaster PWA"

    # Terminate each instance
    foreach ($process in $processes) {
        Write-Host "Terminating process ID $($process.Id)"
        $process.Kill()
    }

    Write-Host "All StudyMaster PWA instances of $processName have been terminated."
} else {
    Write-Host "No running instances of $processName related to StudyMaster PWA found."
}