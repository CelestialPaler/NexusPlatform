import os
import subprocess
import threading
import json
import time
import re
from backend.managers.base import BaseManager

class IperfManager(BaseManager):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self.iperf_processes = {}
        self.iperf_threads = {}

    def get_versions(self):
        """Check available iPerf versions in tools/iperf."""
        tools_dir = os.path.join(self.base_dir, 'tools', 'iperf')
        versions = []
        if os.path.exists(os.path.join(tools_dir, 'iperf3.exe')):
            versions.append('iperf3')
        if os.path.exists(os.path.join(tools_dir, 'iperf-2.2.1-win64.exe')):
            versions.append('iperf2')
        return versions

    def stop(self, instance_id):
        """Stop the running iPerf process."""
        if instance_id in self.iperf_processes:
            try:
                self.iperf_processes[instance_id].terminate()
                return {"status": "stopped"}
            except Exception as e:
                return {"status": "error", "message": str(e)}
        return {"status": "no_process"}

    def run(self, config):
        """Run iPerf with the given configuration."""
        instance_id = config.get('id')
        if not instance_id:
             return {"status": "error", "message": "Instance ID required"}

        if instance_id in self.iperf_processes:
            return {"status": "error", "message": "iPerf instance already running"}

        tools_dir = os.path.join(self.base_dir, 'tools', 'iperf')
        
        exe_name = 'iperf3.exe' if config.get('version') == 'iperf3' else 'iperf-2.2.1-win64.exe'
        exe_path = os.path.join(tools_dir, exe_name)

        if not os.path.exists(exe_path):
            return {"status": "error", "message": f"Executable not found: {exe_path}"}

        # Build command
        cmd = [exe_path]
        if config.get('mode') == 'server':
            cmd.append('-s')
        else:
            cmd.append('-c')
            cmd.append(config.get('host', '127.0.0.1'))
        
        # Common args
        if config.get('port'):
            cmd.extend(['-p', str(config.get('port'))])
        if config.get('udp'):
            cmd.append('-u')
        if config.get('interval'):
            cmd.extend(['-i', str(config.get('interval'))])
        if config.get('parallel'):
            cmd.extend(['-P', str(config.get('parallel'))])
        if config.get('format'):
            cmd.extend(['-f', config.get('format')])
        
        # Force flush for iperf3 to ensure real-time logging
        if config.get('version') == 'iperf3':
            cmd.append('--forceflush')
        
        # Custom args
        if config.get('extra_args'):
            cmd.extend(config.get('extra_args').split())

        def run_thread():
            try:
                # Use CREATE_NO_WINDOW (0x08000000) to prevent console window flashing/blocking
                creationflags = 0x08000000
                
                process = subprocess.Popen(
                    cmd, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.STDOUT,
                    universal_newlines=True,
                    creationflags=creationflags,
                    bufsize=1
                )
                self.iperf_processes[instance_id] = process

                # Regex for parsing bandwidth - updated to handle various units
                # Matches: [ ID] Interval       Transfer     Bandwidth
                # [  5]   0.00-1.00   sec  1.18 MBytes  1.18 MBytes/sec
                regex = r"\[\s*\d+\]\s+(\d+\.\d+-\d+\.\d+)\s+sec\s+(\d+(\.\d+)?)\s+([a-zA-Z]+)\s+(\d+(\.\d+)?)\s+([a-zA-Z]+/sec)"
                
                results = []

                for line in iter(process.stdout.readline, ''):
                    if not line: break
                    # Send raw log
                    # self.send_to_js(f"window.dispatchEvent(new CustomEvent('iperf-log', {{ detail: {{ id: '{instance_id}', data: {json.dumps(line.strip())} }} }}))")
                    self.send_to_js({'type': 'iperf-log', 'detail': {'id': instance_id, 'data': line.strip()}})
                    
                    # Parse for chart
                    match = re.search(regex, line)
                    if match:
                        bw_val = float(match.group(5))
                        bw_unit = match.group(7)
                        
                        # Normalize to Mbps
                        multiplier = 1.0
                        if 'Bytes' in bw_unit:
                            multiplier *= 8
                        
                        if 'K' in bw_unit or 'k' in bw_unit: multiplier /= 1000
                        elif 'G' in bw_unit or 'g' in bw_unit: multiplier *= 1000
                        elif 'T' in bw_unit or 't' in bw_unit: multiplier *= 1000000
                        
                        bw_val *= multiplier
                        
                        data_point = {
                            "timestamp": time.strftime('%H:%M:%S'),
                            "bandwidth": bw_val
                        }
                        results.append(data_point)
                        # self.send_to_js(f"window.dispatchEvent(new CustomEvent('iperf-data', {{ detail: {{ id: '{instance_id}', data: {json.dumps(data_point)} }} }}))")
                        self.send_to_js({'type': 'iperf-data', 'detail': {'id': instance_id, 'data': data_point}})
                    
                    # Removed time.sleep(0.05) to improve real-time performance

                process.wait()
                if instance_id in self.iperf_processes:
                    del self.iperf_processes[instance_id]

                # Save results
                try:
                    results_dir = os.path.join(self.base_dir, 'data', 'results')
                    if not os.path.exists(results_dir):
                        os.makedirs(results_dir)
                    
                    filename = f"iperf_result_{instance_id}_{int(time.time())}.json"
                    filepath = os.path.join(results_dir, filename)
                    with open(filepath, 'w') as f:
                        json.dump(results, f, indent=2)
                    
                    # self.send_to_js(f"window.dispatchEvent(new CustomEvent('iperf-log', {{ detail: {{ id: '{instance_id}', data: 'Results saved to {filename}' }} }}))")
                    self.send_to_js({'type': 'iperf-log', 'detail': {'id': instance_id, 'data': f'Results saved to {filename}'}})
                except Exception as e:
                    # self.send_to_js(f"window.dispatchEvent(new CustomEvent('iperf-log', {{ detail: {{ id: '{instance_id}', data: 'Error saving results: {str(e)}' }} }}))")
                    self.send_to_js({'type': 'iperf-log', 'detail': {'id': instance_id, 'data': f'Error saving results: {str(e)}'}})

                # self.send_to_js(f"window.dispatchEvent(new CustomEvent('iperf-done', {{ detail: {{ id: '{instance_id}' }} }}))")
                self.send_to_js({'type': 'iperf-done', 'detail': {'id': instance_id}})

            except Exception as e:
                # self.send_to_js(f"window.dispatchEvent(new CustomEvent('iperf-error', {{ detail: {{ id: '{instance_id}', data: {json.dumps(str(e))} }} }}))")
                self.send_to_js({'type': 'iperf-error', 'detail': {'id': instance_id, 'data': str(e)}})
                if instance_id in self.iperf_processes:
                    del self.iperf_processes[instance_id]

        thread = threading.Thread(target=run_thread, daemon=True)
        self.iperf_threads[instance_id] = thread
        thread.start()

        return {"status": "started", "command": " ".join(cmd)}
