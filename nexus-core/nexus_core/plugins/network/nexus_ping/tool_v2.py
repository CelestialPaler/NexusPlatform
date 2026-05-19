import subprocess
import threading
import json
import time
import re
import logging
import sys
from nexus_core.interfaces import ITool

class PingTool(ITool):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self.ping_processes = {}
        self.ping_threads = {}

    def _build_ping_command(self, config, host):
        cmd = ['ping']
        is_windows = sys.platform == 'win32'
        is_macos = sys.platform == 'darwin'

        count = config.get('count')
        if count:
            cmd.extend(['-n' if is_windows else '-c', str(count)])
        elif is_windows:
            cmd.append('-t')

        size = config.get('size')
        if size:
            cmd.extend(['-l' if is_windows else '-s', str(size)])

        ttl = config.get('ttl')
        if ttl:
            if is_windows:
                cmd.extend(['-i', str(ttl)])
            elif is_macos:
                cmd.extend(['-m', str(ttl)])
            else:
                cmd.extend(['-t', str(ttl)])

        timeout = config.get('timeout')
        if timeout:
            if is_windows:
                cmd.extend(['-w', str(timeout)])
            elif is_macos:
                cmd.extend(['-W', str(timeout)])
            else:
                # Linux ping uses seconds here; keep integer seconds to avoid invalid millisecond values.
                cmd.extend(['-W', str(max(1, int(timeout / 1000)))])

        if config.get('fragment') and is_windows:
            cmd.append('-f')
        if config.get('resolve') and is_windows:
            cmd.append('-a')
        if config.get('ipVersion') == '4':
            cmd.append('-4')
        elif config.get('ipVersion') == '6':
            cmd.append('-6')

        cmd.append(host)
        return cmd

    def _build_latency_regex(self):
        return r"time\s*[=<]?\s*(\d+(?:\.\d+)?)\s*ms"

    def _is_timeout_line(self, line):
        lowered = line.lower()
        timeout_markers = [
            'request timed out',
            'destination host unreachable',
            'request timeout',
            '100.0% packet loss',
            '100% packet loss',
        ]
        return any(marker in lowered for marker in timeout_markers)

    def get_metadata(self):
        return {
            "name": "Ping",
            "id": "nexus.network.ping",
            "version": "2.0",
            "category": "Network",
            "description": "Send ICMP Echo Requests to network hosts",
            "inputs": {
                "host": {"type": "string", "default": "8.8.8.8", "label": "Target IP/Domain"},
                "count": {"type": "number", "default": 0, "label": "Count (0=Infinite)"},
                "interval": {"type": "number", "default": 1, "label": "Interval (s)"},
                "size": {"type": "number", "default": 32, "label": "Packet Size (bytes)"}
            },
            "outputs": {
                "events": ["ping-log", "ping-data", "ping-done", "ping-error"]
            }
        }

    def stop(self, instance_id):
        """Stop the running Ping process."""
        logging.info(f"Stopping Ping instance: {instance_id}")
        if instance_id in self.ping_processes:
            try:
                logging.info(f"Terminating process for {instance_id}")
                self.ping_processes[instance_id].terminate()
                return {"status": "stopped"}
            except Exception as e:
                logging.error(f"Error stopping ping: {e}")
                return {"status": "error", "message": str(e)}
        logging.warning(f"No process found for {instance_id}")
        return {"status": "no_process"}

    def run(self, config, callback=None):
        """Run Ping with the given configuration."""
        logging.info(f"PingManager.run called with {config}")
        instance_id = config.get('id')
        host = config.get('host', '127.0.0.1')
        
        if not instance_id:
             return {"status": "error", "message": "Instance ID required"}

        if instance_id in self.ping_processes:
            return {"status": "error", "message": "Ping instance already running"}

        cmd = self._build_ping_command(config, host)
        
        def run_thread():
            logging.info(f"Ping thread started for {instance_id}")
            try:
                logging.info(f"Executing command: {cmd}")
                popen_kwargs = {
                    'args': cmd,
                    'stdout': subprocess.PIPE,
                    'stderr': subprocess.STDOUT,
                    'universal_newlines': True,
                    'bufsize': 1,
                }
                if sys.platform == 'win32':
                    # Prevent an extra console window on Windows.
                    popen_kwargs['creationflags'] = 0x08000000

                process = subprocess.Popen(**popen_kwargs)
                self.ping_processes[instance_id] = process
                logging.info(f"Process started with PID {process.pid}")

                regex = self._build_latency_regex()
                
                for line in iter(process.stdout.readline, ''):
                    if not line: break
                    
                    # Send raw log
                    if callback:
                        callback('ping-log', {'id': instance_id, 'data': line.strip()})
                    
                    # Parse for chart
                    match = re.search(regex, line)
                    if match:
                        latency = round(float(match.group(1)), 2)
                        data_point = {
                            "timestamp": time.strftime('%H:%M:%S'),
                            "latency": latency
                        }
                        if callback:
                            callback('ping-data', {'id': instance_id, 'data': data_point})
                    elif self._is_timeout_line(line):
                         # Handle packet loss/timeout
                         data_point = {
                            "timestamp": time.strftime('%H:%M:%S'),
                            "latency": None, # Indicate loss
                            "error": "timeout"
                        }
                         if callback:
                            callback('ping-data', {'id': instance_id, 'data': data_point})
                    
                    # Yield to avoid blocking UI
                    time.sleep(0.05)

                process.wait()
                if instance_id in self.ping_processes:
                    del self.ping_processes[instance_id]

                if callback:
                    callback('ping-done', {'id': instance_id})

            except Exception as e:
                if callback:
                    callback('ping-error', {'id': instance_id, 'data': str(e)})
                if instance_id in self.ping_processes:
                    del self.ping_processes[instance_id]

        thread = threading.Thread(target=run_thread, daemon=True)
        self.ping_threads[instance_id] = thread
        thread.start()

        return {"status": "started", "command": " ".join(cmd)}
