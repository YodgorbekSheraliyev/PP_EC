# JMeter Load Testing Automation Script
# PowerShell runner for Apache JMeter load tests
# Fully compatible with PowerShell 5.1+

param(
    [string]$TestType = "ramp-up",
    [int]$NumThreads = 0,
    [int]$RampUpTime = 0,
    [int]$Duration = 0,
    [string]$ServerHost = "localhost",
    [int]$ServerPort = 3000,
    [switch]$GuiMode = $false,
    [switch]$GenerateReport = $true
)

# Define output colors
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
}

# Write colored output to console
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Verify JMeter is installed
function Verify-JMeterInstallation {
    Write-ColorOutput "Checking JMeter installation..." $Colors.Info

    # Try jmeter command first
    try {
        $version = jmeter --version 2>&1
        if ($?) {
            Write-ColorOutput "JMeter found: $version" $Colors.Success
            return $true
        }
    } catch { }

    # Try common installation paths
    $jmeterPaths = @(
        "C:\tools\apache-jmeter\bin\jmeter.bat",
        "C:\tools\apache-jmeter-5.6.3\bin\jmeter.bat",
        "C:\Program Files\apache-jmeter\bin\jmeter.bat",
        "$env:JMETER_HOME\bin\jmeter.bat"
    )

    foreach ($path in $jmeterPaths) {
        if (Test-Path $path) {
            Write-ColorOutput "JMeter found at: $path" $Colors.Success
            # Create a global alias for jmeter
            Set-Alias -Name jmeter -Value $path -Scope Global -Force
            return $true
        }
    }

    Write-ColorOutput "JMeter not found" $Colors.Error
    Write-ColorOutput "Download from: https://jmeter.apache.org/download_jmeter.cgi" $Colors.Warning
    return $false
}

# Verify application is running
function Verify-ApplicationRunning {
    param([string]$ServerHost, [int]$ServerPort)

    $addr = "${ServerHost}:${ServerPort}"
    Write-ColorOutput "Checking application at $addr..." $Colors.Info

    try {
        $uri = "http://${ServerHost}:${ServerPort}"
        $response = Invoke-WebRequest -Uri $uri -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 301) {
            Write-ColorOutput "Application is running" $Colors.Success
            return $true
        }
    } catch {
        Write-ColorOutput "Cannot connect to http://$addr" $Colors.Error
        Write-ColorOutput "Start with: npm start" $Colors.Warning
        return $false
    }
    return $false
}

# Get test configuration by type
function Get-TestConfiguration {
    param([string]$TestType)

    $configs = @{
        "smoke" = @{
            Name = "Smoke Test"
            Threads = 10
            RampUpTime = 60
            Duration = 300
            Description = "Quick sanity check"
        }
        "ramp-up" = @{
            Name = "Ramp-up Test"
            Threads = 250
            RampUpTime = 300
            Duration = 900
            Description = "Gradually increase load"
        }
        "sustained" = @{
            Name = "Sustained Load"
            Threads = 300
            RampUpTime = 120
            Duration = 600
            Description = "Test stability"
        }
        "spike" = @{
            Name = "Spike Test"
            Threads = 400
            RampUpTime = 10
            Duration = 1200
            Description = "Sudden traffic surge"
        }
        "stress" = @{
            Name = "Stress Test"
            Threads = 500
            RampUpTime = 600
            Duration = 1800
            Description = "Push to breaking point"
        }
    }

    if ($configs.ContainsKey($TestType)) {
        return $configs[$TestType]
    }
    return $configs["ramp-up"]
}

# Run the selected load test
function Run-LoadTest {
    param(
        [string]$TestType,
        [int]$NumThreads,
        [int]$RampUpTime,
        [int]$Duration
    )

    $config = Get-TestConfiguration $TestType

    if ($NumThreads -gt 0) { $config.Threads = $NumThreads }
    if ($RampUpTime -gt 0) { $config.RampUpTime = $RampUpTime }
    if ($Duration -gt 0) { $config.Duration = $Duration }

    Write-ColorOutput "`n===========================================" $Colors.Info
    Write-ColorOutput "$($config.Name)" $Colors.Info
    Write-ColorOutput "===========================================" $Colors.Info

    Write-ColorOutput "`nTest Configuration:" $Colors.Info
    Write-ColorOutput "Type: $TestType" $Colors.Info
    Write-ColorOutput "Users: $($config.Threads)" $Colors.Info
    Write-ColorOutput "Ramp-up: $($config.RampUpTime)s" $Colors.Info
    Write-ColorOutput "Duration: $($config.Duration)s" $Colors.Info
    Write-ColorOutput "Server: ${ServerHost}:${ServerPort}" $Colors.Info
    Write-ColorOutput "Description: $($config.Description)" $Colors.Info

    $scriptDir = Split-Path -Parent $PSCommandPath
    $testPlansDir = Join-Path $scriptDir "..\test-plans"
    $testPlanFile = Join-Path $testPlansDir "${TestType}-test.jmx"

    if (-not (Test-Path $testPlanFile)) {
        Write-ColorOutput "`nError: Test plan not found at $testPlanFile" $Colors.Error
        return $false
    }

    $resultsDir = Join-Path $scriptDir "..\results"
    if (-not (Test-Path $resultsDir)) {
        New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $resultsCsv = Join-Path $resultsDir "${TestType}-results-${timestamp}.csv"
    $resultsLog = Join-Path $resultsDir "${TestType}-results-${timestamp}.log"
    $resultsHtml = Join-Path $resultsDir "${TestType}-report-${timestamp}"

    Write-ColorOutput "`nStarting test (approx $($($config.RampUpTime + $config.Duration) / 60) minutes)..." $Colors.Info

    try {
        & jmeter -n `
            -t "$testPlanFile" `
            -l "$resultsCsv" `
            -j "$resultsLog" `
            -Dtargethost=$ServerHost `
            -Dtargetport=$ServerPort

        Write-ColorOutput "Test completed!" $Colors.Success
        Write-ColorOutput "Results: $resultsCsv" $Colors.Info
        return $true
    }
    catch {
        Write-ColorOutput "Error: $_" $Colors.Error
        return $false
    }
}

# Display help information
function Show-Help {
    Write-ColorOutput @"

Load Testing Runner for Apache JMeter

Usage:
  .\run-load-tests.ps1 -TestType smoke
  .\run-load-tests.ps1 -TestType ramp-up -NumThreads 500

Parameters:
  -TestType              Test type: smoke, ramp-up, sustained, spike, stress
  -NumThreads INT        Override number of users (default: from test type)
  -RampUpTime INT        Override ramp-up time in seconds
  -Duration INT          Override test duration in seconds
  -ServerHost STRING     Server hostname or IP (default: localhost)
  -ServerPort INT        Server port (default: 3000)
  -GuiMode              Open JMeter GUI instead of headless mode
  -GenerateReport       Generate HTML report (default: true)

Examples:
  .\run-load-tests.ps1 -TestType smoke
  .\run-load-tests.ps1 -TestType sustained -NumThreads 500
  .\run-load-tests.ps1 -TestType stress -ServerHost 192.168.1.100

"@
}

# Main execution function
function Main {
    Write-ColorOutput @"

==========================================
JMeter Load Testing Runner v1.0
==========================================

"@ $Colors.Info

    # Verify prerequisites
    if (-not (Verify-JMeterInstallation)) {
        exit 1
    }

    if (-not (Verify-ApplicationRunning -ServerHost $ServerHost -ServerPort $ServerPort)) {
        exit 1
    }

    # Run the selected test
    $success = Run-LoadTest -TestType $TestType -NumThreads $NumThreads -RampUpTime $RampUpTime -Duration $Duration

    if ($success) {
        Write-ColorOutput "`n===========================================" $Colors.Success
        Write-ColorOutput "Test execution completed successfully!" $Colors.Success
        Write-ColorOutput "===========================================" $Colors.Success
        Write-ColorOutput "`nResults saved to: jmeter/results/" $Colors.Info
        Write-ColorOutput "View HTML report to see detailed metrics" $Colors.Info
        exit 0
    } else {
        Write-ColorOutput "`nTest execution failed!" $Colors.Error
        exit 1
    }
}

# Parse help request
if ($TestType -eq "help" -or $TestType -eq "-help" -or $TestType -eq "--help") {
    Show-Help
    exit 0
}

# Execute main entry point
Main
