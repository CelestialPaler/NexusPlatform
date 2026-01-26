import subprocess
import threading
import json
import time
import re
import logging
from backend.managers.base import BaseManager

class PingManager(BaseManager):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self.ping_processes = {}
        self.ping_threads = {}

    def stop(self, instance_id):
        """Stop the running Ping process."""
        if instance_id in self.ping_processes:
            try:
                self.ping_processes[instance_id].terminate()
                return {"status": "stopped"}
            except Exception as e:
                return {"status": "error", "message": str(e)}
        return {"status": "no_process"}

    def run(self, config):
        """Run Ping with the given configuration."""
        logging.info(f"PingManager.run called with {config}")
        instance_id = config.get('id')
        host = config.get('host', '127.0.0.1')
        
        if not instance_id:
             return {"status": "error", "message": "Instance ID required"}

        if instance_id in self.ping_processes:
            return {"status": "error", "message": "Ping instance already running"}

        # Build command (Windows specific)
        cmd = ['ping']
        
        # Count vs Continuous
        if config.get('count'):
            cmd.extend(['-n', str(config.get('count'))])
        else:
            cmd.append('-t')
        
        # Add optional parameters
        if config.get('size'):
            cmd.extend(['-l', str(config.get('size'))])
        if config.get('ttl'):
            cmd.extend(['-i', str(config.get('ttl'))])
        if config.get('timeout'):
            cmd.extend(['-w', str(config.get('timeout'))])
        if config.get('fragment'):
            cmd.append('-f')
        if config.get('resolve'):
            cmd.append('-a')
        if config.get('ipVersion') == '4':
            cmd.append('-4')
        elif config.get('ipVersion') == '6':
            cmd.append('-6')
            
        cmd.append(host)
        
        def run_thread():
            logging.info(f"Ping thread started for {instance_id}")
            try:
                # Use CREATE_NO_WINDOW (0x08000000) to prevent console window flashing/blocking
                creationflags = 0x08000000
                
                logging.info(f"Executing command: {cmd}")
                process = subprocess.Popen(
                    cmd, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.STDOUT,
                    universal_newlines=True,
                    creationflags=creationflags,
                    bufsize=1
                )
                self.ping_processes[instance_id] = process
                logging.info(f"Process started with PID {process.pid}")

                # Regex for parsing time (Windows: time=XXms or time<1ms)
                regex = r"time[=<](\d+)ms"
                
                for line in iter(process.stdout.readline, ''):
                    if not line: break
                    
                    # Send raw log
                    # self.send_to_js(f"window.dispatchEvent(new CustomEvent('ping-log', {{ detail: {{ id: '{instance_id}', data: {json.dumps(line.strip())} }} }}))")
                    self.send_to_js({'type': 'ping-log', 'detail': {'id': instance_id, 'data': line.strip()}})
                    
                    # Parse for chart
                    match = re.search(regex, line)
                    if match:
                        latency = int(match.group(1))
                        data_point = {
                            "timestamp": time.strftime('%H:%M:%S'),
                            "latency": latency
                        }
                        # self.send_to_js(f"window.dispatchEvent(new CustomEvent('ping-data', {{ detail: {{ id: '{instance_id}', data: {json.dumps(data_point)} }} }}))")
                        self.send_to_js({'type': 'ping-data', 'detail': {'id': instance_id, 'data': data_point}})
                    elif "Request timed out" in line or "Destination host unreachable" in line:
                         # Handle packet loss/timeout
                         data_point = {
                            "timestamp": time.strftime('%H:%M:%S'),
                            "latency": None, # Indicate loss
                            "error": "timeout"
                        }
                         # self.send_to_js(f"window.dispatchEvent(new CustomEvent('ping-data', {{ detail: {{ id: '{instance_id}', data: {json.dumps(data_point)} }} }}))")
                         self.send_to_js({'type': 'ping-data', 'detail': {'id': instance_id, 'data': data_point}})
                    
                    # Yield to avoid blocking UI
                    time.sleep(0.05)

                process.wait()
                if instance_id in self.ping_processes:
                    del self.ping_processes[instance_id]

                # self.send_to_js(f"window.dispatchEvent(new CustomEvent('ping-done', {{ detail: {{ id: '{instance_id}' }} }}))")
                self.send_to_js({'type': 'ping-done', 'detail': {'id': instance_id}})

            except Exception as e:
                # self.send_to_js(f"window.dispatchEvent(new CustomEvent('ping-error', {{ detail: {{ id: '{instance_id}', data: {json.dumps(str(e))} }} }}))")
                self.send_to_js({'type': 'ping-error', 'detail': {'id': instance_id, 'data': str(e)}})
                if instance_id in self.ping_processes:
                    del self.ping_processes[instance_id]

        thread = threading.Thread(target=run_thread, daemon=True)
        self.ping_threads[instance_id] = thread
        thread.start()

        return {"status": "started", "command": " ".join(cmd)}
