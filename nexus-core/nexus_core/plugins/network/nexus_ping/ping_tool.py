import platform
import subprocess
import re
from typing import Dict, Any
from nexus_sdk import nexus_node, NXPath, NXTable, NexusPluginError

@nexus_node(
    id="nexus.tools.ping",
    category="Network",
    label="Ping Tool",
    icon="api",  # Will use a network icon in frontend
    inputs={
        "target": str,
        "count": int
    },
    outputs={
        "summary": dict,
        "raw_output": str
    },
    description="Check network connectivity to a target host."
)
def check_connectivity(target: str, count: int = 4) -> Dict[str, Any]:
    """
    Executes system ping command and returns parsed results.
    """
    # 1. Parameter Validation
    if not target:
        raise NexusPluginError("Target host is required", code="INVALID_INPUT")
    
    # 2. Prepare Command
    system = platform.system().lower()
    if system == "windows":
        cmd = ["ping", "-n", str(count), target]
    else:
        cmd = ["ping", "-c", str(count), target]
        
    # 3. Execute
    try:
        # distinct separation of capturing output
        process = subprocess.run(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True, 
            check=False
        )
    except Exception as e:
        raise NexusPluginError(f"Failed to execute ping: {str(e)}", code="EXEC_FAIL")

    # 4. Parse Results (Simple Regex for demonstration)
    output = process.stdout
    success = process.returncode == 0
    
    # Extract latency if successful
    latency_match = re.search(r"Average = (\d+)ms", output)
    avg_latency = int(latency_match.group(1)) if latency_match else -1
    
    # 5. Return Standard Output
    return {
        "summary": {
            "target": target,
            "success": success,
            "packets_sent": count,
            "avg_latency_ms": avg_latency
        },
        "raw_output": output
    }

if __name__ == "__main__":
    # Smoke Test
    import json
    print("Running Ping Tool Smoke Test...")
    try:
        result = check_connectivity("8.8.8.8", count=2)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}")
