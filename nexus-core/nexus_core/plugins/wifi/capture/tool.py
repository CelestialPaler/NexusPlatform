import logging
import threading
import subprocess
import os
import sys
import paramiko
import time
from datetime import datetime

import json

class WirelessCaptureTool:
    def __init__(self, base_dir):
        # Set specific logger
        self.logger = logging.getLogger("WirelessCapture")
        self.logger.info(f"LOADING WirelessCaptureTool from: {__file__}")
        self.base_dir = base_dir
        
        self.capture_process = None
        self.capture_thread = None
        self.is_capturing = False
        self.capture_status = {
            "state": "idle",
            "duration": 0,
            "packets": 0,
            "size": "0 B"
        }
        self.output_file = None
        self.hosts_file = os.path.join(self.base_dir, 'backend', 'data', 'capture_hosts.json')
        self._ensure_hosts_file()
        
        # Persistent SSH Connection
        self.ssh_client = None
        self.ssh_config = None # Store current connection params (host, user, etc.)
        
        self.logger.info("WirelessCaptureManager initialized.")

    def _list_local_interfaces(self):
        """List local interfaces using tshark."""
        self.logger.info("Getting local interfaces using tshark...")
        interfaces = []
        tshark_path = "tshark"
        
        # Win32 Path Discovery
        if sys.platform == 'win32':
             potential_paths = [
                 r"C:\Program Files\Wireshark\tshark.exe",
                 r"C:\Program Files (x86)\Wireshark\tshark.exe"
             ]
             for p in potential_paths:
                 if os.path.exists(p):
                     tshark_path = p
                     break
        
        try:
            # Hide console window
            startupinfo = None
            if sys.platform == 'win32':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                
            # Run tshark -D
            proc = subprocess.run([tshark_path, "-D"], capture_output=True, text=True, startupinfo=startupinfo)
            
            if proc.returncode == 0:
                for line in proc.stdout.splitlines():
                    line = line.strip()
                    if not line: continue
                    # Format: "1. \Device\NPF_{GUID} (Friendly Name)"
                    try:
                        parts = line.split('. ', 1)
                        if len(parts) < 2: continue
                        
                        raw_desc = parts[1]
                        
                        # Extract friendly name: usually "ID (Friendly)"
                        if raw_desc.endswith(')'):
                            last_open = raw_desc.rfind('(')
                            if last_open != -1:
                                id_val = raw_desc[:last_open].strip()
                                friendly = raw_desc[last_open+1:-1]
                            else:
                                id_val = raw_desc
                                friendly = raw_desc
                        else:
                            id_val = raw_desc
                            friendly = raw_desc
                        
                        # Determine type heuristically
                        is_wifi = any(x in friendly.lower() for x in ['wi-fi', 'wlan', 'wireless', '802.11'])
                            
                        interfaces.append({
                            "name": friendly, # Display name
                            "id": id_val,     # Tshark ID usually
                            "driver": id_val,
                            "type": "Wireless" if is_wifi else "Ethernet",
                            "mode": "managed", # Default for Win
                            "ip": "",       # tshark -D doesn't give IP
                            "mac": ""       # tshark -D doesn't give MAC
                        })
                    except Exception as parse_err:
                        self.logger.warning(f"Failed to parse tshark line '{line}': {parse_err}")
            else:
                self.logger.warning(f"tshark -D returned non-zero: {proc.stderr}")

        except FileNotFoundError:
            self.logger.error("Tshark not found. Please ensure Wireshark is installed and in PATH.")
        except Exception as e:
            self.logger.error(f"Error executing tshark: {e}")
            
        return interfaces

    def scan_interfaces_safe(self, config=None):
        """List network interfaces (Local or Remote) - Renamed to avoid cache collisions."""
        self.logger.info(f"[SafeScan] Listing interfaces with config: {config}")
        try:
            if config and config.get('mode') == 'ssh':
                res = self.scan_remote_interfaces(config)
                # Normalize Remote Response (Dict -> List)
                if isinstance(res, dict):
                    if res.get('status') == 'success' and 'data' in res:
                        # Extract nested interfaces list
                        final_list = res['data'].get('interfaces', [])
                    else:
                        # On error or empty, return empty list
                        if res.get('status') == 'error':
                            self.logger.warning(f"Remote scan error: {res.get('message')}")
                        final_list = []
                elif isinstance(res, list):
                    final_list = res
                else:
                    final_list = []
                
                self.logger.info(f"Remote interfaces found (normalized): {len(final_list)}")
                return final_list
            else:
                res = self._list_local_interfaces()
                self.logger.info(f"Local interfaces found: {len(res) if res else 0}")
                return res
        except Exception as e:
            self.logger.error(f"Error listing interfaces: {e}")
            return []

    def list_interfaces(self, config=None, *args, **kwargs):
        return self.scan_interfaces_safe(config)

    def _get_ssh_client(self, config, force_reconnect=False):
        """
        Get or establish a persistent SSH connection.
        """
        host = config.get('target') or config.get('ip')
        user = config.get('ssh_user')
        password = config.get('ssh_pass')
        port = int(config.get('ssh_port', 22))
        
        if not host:
             raise ValueError("No host specified")

        current_params = f"{user}@{host}:{port}"
        
        # Check if we can reuse:
        if self.ssh_client and not force_reconnect:
             # Check if params matched
             if self.ssh_config == current_params:
                 # Check if active
                 if self.ssh_client.get_transport() and self.ssh_client.get_transport().is_active():
                     return self.ssh_client
                 else:
                     self.logger.info("SSH Transport inactive, reconnecting...")
             else:
                  self.logger.info(f"SSH Target changed ({self.ssh_config} -> {current_params}), reconnecting...")
        
        # Connect New
        if self.ssh_client:
            try: self.ssh_client.close()
            except: pass
            
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.logger.info(f"Establishing persistent SSH to {current_params}...")
        client.connect(host, port=port, username=user, password=password, timeout=10)
        
        self.ssh_client = client
        self.ssh_config = current_params
        return client

    def _run_sudo_cmd(self, client, cmd, password, user):
        """Helper to run command with sudo if needed on a persistent client."""
        # Note: On persistent client, exec_command opens a NEW channel. 
        # So 'cd /' in one call doesn't affect the next.
        if user != 'root':
            cmd = f"echo '{password}' | sudo -S -p '' sh -c '{cmd}'"
        else:
            # Wrap in sh -c to ensure complex commands (&&, ||) work as expected
             cmd = f"sh -c '{cmd}'"
             
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode()
        err = stderr.read().decode()
        code = stdout.channel.recv_exit_status()
        return out, err, code
        
    def _ensure_hosts_file(self):
        if not os.path.exists(os.path.dirname(self.hosts_file)):
            os.makedirs(os.path.dirname(self.hosts_file), exist_ok=True)
        if not os.path.exists(self.hosts_file):
            with open(self.hosts_file, 'w') as f:
                json.dump([], f)

    def get_hosts(self):
        try:
            with open(self.hosts_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load hosts: {e}")
            return []

    def save_host(self, host_data):
        hosts = self.get_hosts()
        # Update if exists (by IP), else append
        existing = next((h for h in hosts if h['ip'] == host_data['ip']), None)
        if existing:
            existing.update(host_data)
        else:
            hosts.append(host_data)
        
        with open(self.hosts_file, 'w') as f:
            json.dump(hosts, f, indent=2)
        return hosts

    def delete_host(self, ip):
        hosts = self.get_hosts()
        hosts = [h for h in hosts if h['ip'] != ip]
        with open(self.hosts_file, 'w') as f:
            json.dump(hosts, f, indent=2)
        return hosts

    def scan_remote_interfaces(self, config):
        """
        Scan remote interfaces via SSH.
        Returns: { 'interfaces': [], 'tools': { 'tcpdump': bool, 'iw': bool, 'airmon': bool } }
        """
        host = config.get('target') # or from specific ssh fields
        if not host: 
            host = config.get('ip') # fallback
        
        user = config.get('ssh_user')
        password = config.get('ssh_pass')
        port = int(config.get('ssh_port', 22))

        result = {
            "interfaces": [],
            "tools": { "tcpdump": False, "iw": False, "airmon-ng": False }
        }

        try:
            client = self._get_ssh_client(config)
            user = config.get('ssh_user')
            password = config.get('ssh_pass')

            # Helper for scan (no sudo needed usually, but good to have)
            def run_cmd(c):
                # Simple exec, no sudo usually needed for listing
                stdin, stdout, stderr = client.exec_command(c)
                return stdout, stderr
            
            # Check Tools
            for tool in result["tools"].keys():
                out, err = run_cmd(f"which {tool}")
                if out.read().strip():
                    result["tools"][tool] = True

            # List Interfaces (ip link + iw dev)
            # 1. Get basic list from /sys/class/net
            out, err = run_cmd("ls /sys/class/net")
            basic_ifaces = out.read().decode().splitlines()
            
            # 2. Get detailed wireless info
            iw_info = {}
            if result["tools"]["iw"]:
                out, err = run_cmd("iw dev")
                # Parse iw dev output
                # Interface wlan0
                #   ifindex 3
                #   wdev 0x1
                #   addr ...
                #   type managed
                current_iface = None
                for line in out.read().decode().splitlines():
                    line = line.strip()
                    if line.startswith("phy#"):
                         # Reset logic when hitting a new physical device section
                         current_iface = None
                    elif line.startswith("Unnamed") or "non-netdev" in line:
                         # Explicitly handle unnamed P2P devices to prevent attribute bleeding
                         current_iface = None
                    elif line.startswith("Interface"):
                        current_iface = line.split(" ")[1]
                        iw_info[current_iface] = {"type": "unknown", "mode": "unknown"}
                    elif "type" in line and current_iface:
                        parts = line.split(" ")
                        if len(parts) >= 2:
                            mode_val = parts[1]
                            iw_info[current_iface]["mode"] = mode_val
            
            # 3. Get driver/chipset info via ethtool or reading /sys/class/net/*/device/uevent
            driver_info = {}
            for iface in basic_ifaces:
                 iface = iface.strip()
                 # Try read uevevnt
                 out, err = run_cmd(f"readlink -f /sys/class/net/{iface}/device/driver")
                 driver_path = out.read().decode().strip()
                 driver_name = os.path.basename(driver_path) if driver_path else "unknown"
                 driver_info[iface] = driver_name

            # Combine info
            for iface_name in basic_ifaces:
                iface_name = iface_name.strip()
                if not iface_name: continue
                # Skip lo
                if iface_name == "lo": continue
                
                info = {
                    "id": iface_name,
                    "name": iface_name,
                    "type": "Ethernet", # default
                    "mode": "-",
                    "driver": driver_info.get(iface_name, "generic")
                }
                
                if iface_name in iw_info:
                    info["type"] = "Wi-Fi"
                    info["mode"] = iw_info[iface_name].get("mode", "unknown")
                elif "eth" in iface_name or "en" in iface_name:
                    info["type"] = "Ethernet"
                elif "tun" in iface_name:
                     info["type"] = "Tunnel"

                result["interfaces"].append(info)
                
            return {"status": "success", "data": result}

        except Exception as e:
            self.logger.error(f"SSH Scan failed: {e}")
            # Force reset details on failure to allow retry
            self.ssh_client = None 
            return {"status": "error", "message": str(e)}
        # finally:
        #    client.close() # DO NOT CLOSE for persistence

    def open_capture_folder(self):
        """Open the folder containing pcap files."""
        folder = os.path.join(self.base_dir, 'backend', 'data', 'pcap')
        if not os.path.exists(folder):
            os.makedirs(folder, exist_ok=True)
            
        try:
            if sys.platform == 'win32':
                os.startfile(folder)
            elif sys.platform == 'darwin':
                subprocess.Popen(['open', folder])
            else:
                subprocess.Popen(['xdg-open', folder])
            return True
        except Exception as e:
            self.logger.error(f"Failed to open folder: {e}")
            return False

    def set_interface_mode(self, config):
        """
        Switch Interface Mode (Managed <-> Monitor)
        config: { target (IP), ssh_user, ssh_pass, interface, mode: 'managed'|'monitor' }
        """
        ip = config.get('target') or config.get('ip')
        user = config.get('ssh_user')
        password = config.get('ssh_pass')
        iface = config.get('interface')
        mode = config.get('mode') # monitor | managed
        
        if not all([ip, user, password, iface, mode]):
            return {"status": "error", "message": "Missing params"}

        try:
            client = self._get_ssh_client(config)
            
            # Check if already in desired mode to avoid busy errors
            # iw dev <iface> info
            current_mode = "unknown"
            out_info, _, c_info = self._run_sudo_cmd(client, f"iw dev {iface} info", password, user)
            
            if c_info == 0:
                if "type monitor" in out_info:
                    current_mode = "monitor"
                elif "type managed" in out_info:
                    current_mode = "managed"
            
            if current_mode == mode:
                # Still check if we can refresh info just in case
                return {"status": "success", "message": f"{iface} is already in {mode} mode"}

            # Execute Switch
            if mode == 'monitor':
                # PRIORITIZE standard 'iw' command to avoid 'airmon-ng' renaming feature (wlan0 -> wlan0mon)
                # This ensures the frontend 'selected_interface' (wlan0) remains valid.
                
                # Sequence: Down -> Set Monitor -> Up
                # Chained to ensure atomicity against race conditions
                # "ifconfig X down && iw dev X set type monitor && ifconfig X up"
                
                cmd_chain = f"ifconfig {iface} down && iw dev {iface} set type monitor && ifconfig {iface} up"
                
                o, e, code = self._run_sudo_cmd(client, cmd_chain, password, user)
                
                if code != 0:
                    self.logger.warning(f"Standard iw switch failed: {e}. Trying raw list...")
                    # Try individual steps if chained failed (verbose error)
                    # But chained is usually better.
                    
                    # If iw failed, try airmon-ng as fallback
                    self.logger.warning(f"Trying airmon-ng fallback...")
                    o, e, code = self._run_sudo_cmd(client, f"airmon-ng start {iface}", password, user)
                    if code != 0:
                         return {"status": "error", "message": f"Failed to enable monitor: {e}"}
            else:
                # Managed
                # Try airmon-ng stop first if it was used (e.g. wlan0mon)
                # But here 'iface' is passed from frontend. 
                # If we are reversing wlan0 -> managed. Use iw.
                
                cmd_chain = f"ifconfig {iface} down && iw dev {iface} set type managed && ifconfig {iface} up"
                o, e, code = self._run_sudo_cmd(client, cmd_chain, password, user)
                
                if code != 0:
                     return {"status": "error", "message": f"Failed to set managed: {e}"}

            return {"status": "success", "message": f"Switched {iface} to {mode}"}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
        # finally: client.close() # Persistent

    def get_channel_freq(self, channel):
        """Convert channel number to frequency (MHz). Simplified map."""
        try:
            ch = int(channel)
            if 1 <= ch <= 14:
                return 2412 + (ch - 1) * 5
            elif 36 <= ch <= 177:
                return 5180 + (ch - 36) * 5
            # TODO: 6GHz
            return None 
        except:
            return None

    def set_channel(self, config):
        """
        Set Channel/Bandwidth
        config: { target, ssh_user, ssh_pass, interface, channel, bandwidth }
        """
        ip = config.get('target') or config.get('ip')
        user = config.get('ssh_user')
        password = config.get('ssh_pass')
        iface = config.get('interface')
        channel = config.get('channel')
        bw = config.get('bandwidth') or "20"
        
        try:
            client = self._get_ssh_client(config)
            
            # Robust Sequence similar to capture setup
            # Chained with && to ensure sequence and speed
            # Force NetworkManager to ignore this temporarily? 
            # No, just brute force down/up.
            # Using || true for ifconfig down to proceed even if already down? No, just standard.
            
            # Note: "iw set channel" sometimes works on UP interfaces for Monitor mode.
            # But "device busy" implies we must be down or competing with wpa_supplicant.
            # KILL interfering processes? 
            # "airmon-ng check kill" is nuclear. 
            # Let's try aggressive down/up with a small sleep? No, chained commands are better.
            
            # Format: iw dev <devname> set channel <channel> [HT<ht>|S1G<mhz>|VHT<mhz>] [center_freq_1] [center_freq_2]
            # bandwidth: 20, 40, 80, 160
            
            bw_val = int(bw)
            bw_str = ""
            if bw_val == 20: bw_str = "" # 20 is default usually, or HT20
            elif bw_val == 40: bw_str = "HT40+" # or HT40-
            elif bw_val == 80: bw_str = "80MHz"
            elif bw_val == 160: bw_str = "160MHz"
            
            # Simplified channel set
            # Try to just set channel (faster)
            cmd_simple = f"iw dev {iface} set channel {channel} {bw_str}"
            
            # If that fails (Busy), try the down/up dance
            # We wrap the whole thing in a shell script logic
            # "iw ... || (ifconfig ... down && iw ... && ifconfig ... up)"
            
            cmd_robust = f"{cmd_simple} || (ifconfig {iface} down && {cmd_simple} && ifconfig {iface} up)"
            
            o, e, code = self._run_sudo_cmd(client, cmd_robust, password, user)
            
            if code != 0:
                 return {"status": "error", "message": f"Channel set failed: {e.strip()}"}
            
            return {"status": "success", "message": f"Set {iface} to Channel {channel} ({bw}MHz)"}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
        # finally: client.close() # Persistent

    def connect_wifi(self, config):
        """
        Connect to Wi-Fi (Managed Mode)
        config: { target, ssh_user, ssh_pass, interface, ssid, bssid (opt), password (opt) }
        """
        ip = config.get('target') or config.get('ip')
        user = config.get('ssh_user')
        password = config.get('ssh_pass')
        iface = config.get('interface')
        ssid = config.get('ssid')
        wifi_pass = config.get('password') # Corrected key
        
        try:
            client = self._get_ssh_client(config)
            
            # Use nmcli if available, else wpa_supplicant logic?
            # nmcli is safest for Managed mode users.
            
            # Check for nmcli
            out, err, _ = self._run_sudo_cmd(client, "which nmcli", password, user)
            
            if out.strip():
                # use nmcli
                cmd = f"nmcli dev wifi connect '{ssid}' password '{wifi_pass}' ifname {iface}"
                o, e, code = self._run_sudo_cmd(client, cmd, password, user)
                if code == 0:
                    return {"status": "success", "message": f"Connected to {ssid}"}
                else:
                    return {"status": "error", "message": f"nmcli failed: {e} {o}"}
            else:
                 return {"status": "error", "message": "nmcli not found. Manual wpa_supplicant not yet implemented."}
                 
        except Exception as e:
            return {"status": "error", "message": str(e)}
        # finally: client.close()
            
    def get_status(self):
        """Get current capture status."""
        return self.capture_status

    def list_interfaces(self):
        """List available local network interfaces."""
        interfaces = []
        try:
            # Using tshark via subprocess to list interfaces usually gives better names on Windows
            # If tshark is not available, we can fallback to scapy or manual list
            # Note: scapy `get_if_list()` on Windows returns GUIDs which are not user friendly.
            # Using tshark -D
            cmd = ["tshark", "-D"]
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, stderr = process.communicate()
            
            if process.returncode == 0:
                for line in stdout.splitlines():
                    # Format: 1. \Device\NPF_{GUID} (Wi-Fi)
                    parts = line.strip().split(' ', 1)
                    if len(parts) == 2:
                        idx = parts[0].replace('.', '')
                        name = parts[1]
                        interfaces.append({"id": name.split(' (')[0], "name": name, "raw": line})
            else:
                self.logger.warning(f"Failed to list interfaces with tshark: {stderr}")
                interfaces.append({"id": "fallback", "name": "Please install Wireshark/Npcap"})
        except FileNotFoundError:
             self.logger.error("tshark not found.")
             interfaces.append({"id": "error", "name": "Wireshark (tshark) not found in PATH"})
        return interfaces

    def start_capture(self, config):
        if self.is_capturing:
            return {"status": "error", "message": "Already capturing"}

        ip = config.get('target') or config.get('ip') # Remote
        local_id = config.get("target") # Local
        mode = config.get("mode", "local")
        remote_iface = config.get("remote_iface") # Specific iface name for remote
        
        self.is_capturing = True
        self.capture_status = {"state": "starting", "packets": 0, "size": "0 B", "duration": 0}
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        user_suffix = config.get('output_name', 'capture')
        filename = f"{timestamp}-{user_suffix}.pcap"
        self.output_file = os.path.join(self.base_dir, 'backend', 'data', 'pcap', filename)
        
        # Ensure dir exists
        os.makedirs(os.path.dirname(self.output_file), exist_ok=True)
        
        self.start_time = time.time()
        
        try:
             if mode == 'local':
                 self.capture_thread = threading.Thread(target=self._start_local_capture, args=(config, self.output_file))
             else:
                 # Note: _start_ssh_capture logic currently is self-contained.
                 if not remote_iface:
                      raise ValueError("No remote interface selected")
                 # Ensure config has what it needs
                 config['remote_iface'] = remote_iface
                 if ip: config['target'] = ip
                 
                 self.capture_thread = threading.Thread(target=self._start_ssh_capture, args=(config, self.output_file))
             
             self.capture_thread.daemon = True
             self.capture_thread.start()
             
             return {"status": "success", "message": "Capture started", "file": filename}
             
        except Exception as e:
            self.is_capturing = False
            self.capture_status["state"] = "error"
            return {"status": "error", "message": str(e)}

    def stop_capture(self):
        """Stop the current capture."""
        if not self.is_capturing:
            return {"status": "warning", "message": "Not capturing"}
            
        self.logger.info("Stopping capture...")
        
        # Kill process
        if self.capture_process:
            try:
                self.capture_process.terminate()
                # If SSH, we might need to close the SSH client, handled in thread usually
            except Exception as e:
                self.logger.error(f"Error terminating process: {e}")
        
        # Signal SSH thread to stop
        if hasattr(self, 'ssh_stop_event'):
            self.ssh_stop_event.set()
            # Wait for thread to finish (file download etc)
            # But don't block forever
            if hasattr(self, 'ssh_thread') and self.ssh_thread.is_alive():
                # We can join in a non-blocking way or UI might lag.
                # Since download might take time, we should let it run in background?
                # But UI needs to know when "Stopped" really means "File Ready".
                # For now, we update state to "stopping" and let thread set it to "stopped"
                self.capture_status["state"] = "stopping"
                return {"status": "success", "message": "Stopping capture... File transfer in progress."}

        self.is_capturing = False
        self.capture_status["state"] = "stopped"
        return {"status": "success", "message": "Capture stopped"}

    def _start_local_capture(self, config, output_file):
        interface = config.get("target")
        # Only tshark/dumpcap supports raw channel setting easily if adapter supports it in monitor mode.
        # But on Windows, switching channel programmatically usually requires 'Check Point' or specific drivers.
        # Here we assume the user has set the channel OR we try to set it via 'packets' or 'airmon-ng' if Linux.
        # For this tool, we will just run dumpcap.
        
        cmd = ["tshark", "-i", interface, "-w", output_file]
        
        # Duration limit
        duration = int(config.get("duration", 0))
        if duration > 0:
            cmd.extend(["-a", f"duration:{duration}"])
            
        # User defined filter
        pcap_filter = config.get("filter", "").strip()
        if pcap_filter:
            # tshark uses -f for capture filter (BPF), not display filter (-Y)
            # Since we are writing to file, we likely want BPF.
            # Warning: Wireshark display filters (wlan.addr == ...) look different from BPF (ether host ...).
            # If user inputs wireshark style, it will fail with -f.
            # But tshark -w supports -f (BPF) but not -Y (Display Filter) during capture?
            # Actually tshark can use read filter on capture? No.
            # We assume user knows BPF or we suggest BPF.
            cmd.extend(["-f", pcap_filter])
        
        self.logger.info(f"Running command: {' '.join(cmd)}")
        self.capture_process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    def _start_rpcap_capture(self, config, output_file):
        # Format: rpcap://<ip>:<port>/<interface>
        # Usually rpcap://192.168.1.1/wlan0
        target_ip = config.get("target") # User inputs IP
        # We might need an interface name on the remote side, usually user has to provide 'rpcap://IP/Interface'
        # Or we default to getting a list? For now assume user inputs full IP or we construct it.
        # Propose UI allows entering IP, and we assume standard port 2002.
        # But the user instruction says "Input IP address... use remote device".
        # Let's assume we invoke tshark with -i rpcap://...
        
        # If user provided just IP, we can't easily guess interface unless we query it (rpcapd supports listing).
        # For MVP, let's assume valid rpcap URI or just IP and we default to a common one? 
        # Better: UI should probably allow specifying remote interface too.
        # Let's try to construct: rpcap://[IP]:2002/
        
        remote_uri = f"rpcap://{target_ip}:2002/"
        # Ideally we would query interfaces first.
        
        cmd = ["tshark", "-i", remote_uri, "-w", output_file]
        self.logger.info(f"Running RPCAP command: {' '.join(cmd)}")
        self.capture_process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    def _start_ssh_capture(self, config, output_file):
        # SSH into box, run tcpdump, pipe to local file (or tshark)
        # Setup Paramiko
        host = config.get("target")
        user = config.get("ssh_user", "root")
        password = config.get("ssh_pass", "admin") # Insecure default
        port = int(config.get("ssh_port", 22))
        
        channel = config.get("channel")
        bw = config.get("bandwidth", 20)
        
        # Command to run on remote to set channel (highly dependent on driver)
        # e.g. 'iw dev wlan0 set channel 6 HT20'
        # We will attempt a generic command sequence
        remote_iface = config.get("remote_iface", "wlan0") # Need this in UI
        
        setup_cmds = []
        if channel:
             # Basic iw set support
             # User Request Fix: Device busy (-16). Sequence: Down -> Set Channel -> Up
             # Using ifconfig as requested for broader embedded compatibility (BusyBox)
             # NOTE: Some drivers require interface DOWN to set channel, others require UP.
             # We try a robust sequence: Try setting directly, if fail, try down/up dance.
             # Also try iwconfig as fallback.
             
             cmd_set_channel_iw = f"iw dev {remote_iface} set channel {channel} {f'HT{bw}' if int(bw) in [20,40] else f'{bw}MHz'}"
             cmd_set_channel_iwconfig = f"iwconfig {remote_iface} channel {channel}"
             
             # User requested Freq-based setting: iw dev <iface> set freq <freq> [HT/80MHz] [center_freq1] [center_freq2]
             # We can attempt to map channel to freq, but it's complex for 5G/6G.
             # Alternatively, we just use the user requested 'set freq' syntax if they provided a freq? 
             # No, the UI provides 'channel' (int).
             # We will stick to 'set channel' unless it fails hard.
             # BUT, we must ensure iface is DOWN first. 
             # And we should try to kill interfering processes if we can? No, that's destructive.
             
             # Robust Sequence:
             # 1. ifconfig down
             # 2. iw dev set channel (Primary)
             # 3. iwconfig channel (Fallback)
             # 4. ifconfig up
             
             # Also try set freq if channel map is possible
             freq = self.get_channel_freq(channel)
             cmd_set_freq = f"iw dev {remote_iface} set freq {freq} {f'HT{bw}' if int(bw) in [20,40] else f'{bw}MHz'}" if freq else "false"

             setup_cmds.append(f"ifconfig {remote_iface} down")
             # Try set freq -> set channel -> iwconfig
             # Using || chaining
             setup_cmds.append(f"{cmd_set_freq} || {cmd_set_channel_iw} || {cmd_set_channel_iwconfig}")
             setup_cmds.append(f"ifconfig {remote_iface} up")

        # Capture command: Write to remote temp file instead of stdout stream
        # This prevents corruption from sudo prompt mixing with binary stream.
        timestamp_remote = int(time.time())
        self.remote_temp_file = f"/tmp/capture_{timestamp_remote}.pcap"
        
        # Construct capture command
        capture_cmd_base = f"tcpdump -i {remote_iface} -U -w {self.remote_temp_file}"
        
        # Append filter if exists
        pcap_filter = config.get("filter", "").strip()
        if pcap_filter:
            # Safe Quote the filter to prevent injection
            # In shell, wrapped in ' ' is handled by sh -c '...' logic later?
            # We are putting this INTO sh -c '...'
            # Filter example: wlan host 11:22:33...
            capture_cmd_base += f" '{pcap_filter}'"
        else:
            capture_cmd_base += " not port 22" # Default safeguard if no filter
            
        capture_cmd = capture_cmd_base
        
        self.ssh_stop_event = threading.Event()

        # We need a Thread to handle the SSH stream because Popen is local
        def ssh_thread_func():
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            # Initialize local vars to avoid UnboundLocalError
            local_dest_path = output_file 
            
            try:
                client.connect(host, port=port, username=user, password=password, timeout=10)
                # Store connection for stop signal
                self.ssh_client_active = client
                
                # Helper to run with sudo if not root
                def run_sudo(cmd):
                    if user != 'root':
                        # Use sh -c to encapsulate complex commands or pipes
                        cmd = f"echo '{password}' | sudo -S -p '' sh -c '{cmd}'"
                    stdin, stdout, stderr = client.exec_command(cmd)
                    exit_status = stdout.channel.recv_exit_status()
                    err = stderr.read().decode(errors='ignore')
                    if exit_status != 0:
                        self.logger.error(f"SSH Command Failed: {cmd}\nError: {err}")
                    return exit_status
                
                # Kill potential interfering processes
                # self.logger.info("Killing interfering processes (airmon-ng check kill)...")
                # run_sudo("airmon-ng check kill") # Careful, this kills network managers!

                # Run setup commands
                for cmd in setup_cmds:
                    self.logger.info(f"SSH Exec: {cmd}")
                    run_sudo(cmd)
                
                # Run capture (Blocking)
                final_capture_cmd = capture_cmd
                if user != 'root':
                    final_capture_cmd = f"echo '{password}' | sudo -S -p '' sh -c '{capture_cmd}'"
                
                self.logger.info(f"SSH Capture Started: {final_capture_cmd}")
                
                # We execute capture. It will block until killed.
                stdin, stdout, stderr = client.exec_command(final_capture_cmd)
                
                # Monitor stderr for 'tcpdump: listening on...' to confirm start
                # And wait for stop signal.
                # Actually, exec_command returns immediatley for streams, but reading them blocks?
                # No, standard behavior: command runs on remote.
                
                while not self.ssh_stop_event.is_set():
                    if stdout.channel.exit_status_ready():
                        # Command exited prematurely
                        err = stderr.read().decode(errors='ignore')
                        self.logger.error(f"Remote capture exited prematurely: {err}")
                        break
                    time.sleep(0.5)

                # Stop signal received. 
                # We need to kill the tcpdump process on remote.
                # Since we wrapped in sudo sh -c, finding the PID is tricky.
                # Easiest way: killall tcpdump (a bit aggressive if multiple users)
                # Or use pkill.
                self.logger.info("Sending kill signal to remote tcpdump...")
                kill_cmd = "pkill -SIGINT tcpdump" # SIGINT to ensure pcap flush
                run_sudo(kill_cmd)
                
                # Wait for command to exit
                wait_start = time.time()
                while not stdout.channel.exit_status_ready() and time.time() - wait_start < 5:
                    time.sleep(0.2)
                
                # Fix permissions before download (since tcpdump ran as root)
                self.logger.info("Fixing permissions for download...")
                run_sudo(f"chmod 777 {self.remote_temp_file}") # Try 777 to be absolutely sure

                # Download file
                self.logger.info(f"Downloading {self.remote_temp_file} to {local_dest_path}")
                
                # DIAGNOSTIC: Check local write permissions
                try:
                    with open(local_dest_path, 'wb') as f_test:
                        pass
                    self.logger.info("Local file creation test passed.")
                except Exception as e:
                    self.logger.error(f"Local file creation failed: {e}")
                    # Try fallback to temp folder
                    import tempfile
                    local_dest_path = os.path.join(tempfile.gettempdir(), os.path.basename(local_dest_path))
                    self.logger.warning(f"Fallback to temp folder: {local_dest_path}")

                sftp = client.open_sftp()
                try:
                    # Check remote file attrs
                    try:
                        rstat = sftp.stat(self.remote_temp_file)
                        self.logger.info(f"Remote file stats: size={rstat.st_size}, mode={rstat.st_mode}")
                    except Exception as e:
                        self.logger.error(f"Failed to stat remote file: {e}")

                    sftp.get(self.remote_temp_file, local_dest_path)
                    self.logger.info("Download success!")
                    
                    # Clean up remote
                    sftp.remove(self.remote_temp_file)
                except Exception as transfer_error:
                    self.logger.error(f"SFTP Transfer failed: {transfer_error}")
                finally:
                    sftp.close()

            except Exception as e:
                self.logger.error(f"SSH Error: {e}")
            finally:
                if self.ssh_client_active:
                   self.ssh_client_active.close()
                self.is_capturing = False
                self.capture_status["state"] = "stopped"

        self.ssh_thread = threading.Thread(target=ssh_thread_func)
        self.ssh_thread.start()
        # Fake a process object for stop to work (or handle differently)
        self.capture_process = None # Handled by flag in thread loop

    def _monitor_capture(self, limit_duration):
        start_time = time.time()
        while self.is_capturing:
            elapsed = time.time() - start_time
            self.capture_status["duration"] = int(elapsed)
            self.capture_status["state"] = "capturing"
            
            # Check file size
            if self.output_file and os.path.exists(self.output_file):
                size = os.path.getsize(self.output_file)
                self.capture_status["size"] = f"{size / 1024 / 1024:.2f} MB"
            
            if limit_duration > 0 and elapsed >= limit_duration:
                self.stop_capture()
                break
            
            if self.capture_process and self.capture_process.poll() is not None:
                # Process died
                self.logger.warning("Capture process exited unexpectedly")
                self.stop_capture()
                break
                
            time.sleep(1)

