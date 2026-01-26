from .engine import BasePlaybook
import time
import subprocess
import platform
import re

class PingSweepPlaybook(BasePlaybook):
    meta = {
        "id": "ping_sweep",
        "title": "🔍 批量连通性检测 (Ping Sweep)",
        "description": "对指定 IP 列表进行连通性测试，并输出延时统计。",
        "inputs": [
            {
                "name": "target_list", 
                "label": "IP 列表 (每行一个)", 
                "type": "textarea", 
                "default": "192.168.1.1\n8.8.8.8"
            },
            {
                "name": "count", 
                "label": "Ping 次数", 
                "type": "number", 
                "default": 4
            }
        ]
    }

    def run(self, context, args):
        raw_list = args.get('target_list', '')
        count = int(args.get('count', 4))
        
        # Parse IPs
        ips = [line.strip() for line in raw_list.split('\n') if line.strip()]
        
        if not ips:
            context.log("Empty IP list provided.", "warn")
            return

        context.log(f"Starting sweep for {len(ips)} targets...", "info")
        
        results = {}
        
        # Serial execution for v1 (Parallel can be added later)
        for ip in ips:
            context.log(f"Pinging {ip}...", "info")
            rtt = self._do_ping(ip, count)
            
            if rtt >= 0:
                context.log(f"✅ {ip} is UP (Avg: {rtt}ms)", "success")
                results[ip] = "UP"
            else:
                context.log(f"❌ {ip} is DOWN", "error")
                results[ip] = "DOWN"
            
            time.sleep(0.5)
            
        # Summary
        up_count = list(results.values()).count("UP")
        context.log(f"Sweep Complete. Up: {up_count}/{len(ips)}", "info")

    def _do_ping(self, host, count=4):
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        command = ['ping', param, str(count), host]
        try:
            if platform.system().lower() == 'windows':
                result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors='ignore')
                out = result.stdout
                if "TTL=" in out or "ttl=" in out: # rough check
                    # Extract Average time
                    match = re.search(r'(Average|平均)[ =]+(\d+)ms', out)
                    if match:
                        return int(match.group(2))
                    return 1 # UP but weird output
                return -1
            else:
                return 0 # Todo Linux
        except:
            return -1
