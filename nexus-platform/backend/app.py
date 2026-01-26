import sys
import io
import os

# Fix IO issues in frozen environments (PyInstaller --windowed)
# In windowed mode, sys.stdout/stderr might be None or invalid.
# We redirect them to a dummy stream or a log file to prevent libraries (like colorama) from crashing.
if hasattr(sys, 'frozen'):
    # Redirect stdout/stderr to bitbucket if they are None or we are in windowed mode
    class NullWriter:
        def write(self, s): pass
        def flush(self): pass
        def isatty(self): return False
    
    # If stdout is missing or closed, use NullWriter
    try:
        sys.stdout.write("")
    except (AttributeError, ValueError, IOError):
        sys.stdout = NullWriter()
        
    try:
        sys.stderr.write("")
    except (AttributeError, ValueError, IOError):
        sys.stderr = NullWriter()
        
    # Also force utf-8 for TextIOWrapper if it IS a valid stream
    try:
        if isinstance(sys.stdout, io.TextIOWrapper):
            sys.stdout.reconfigure(encoding='utf-8')
    except Exception: pass

    try:
        if isinstance(sys.stderr, io.TextIOWrapper):
            sys.stderr.reconfigure(encoding='utf-8')
    except Exception: pass

# Increase recursion depth to prevent "maximum recursion depth exceeded" errors

# Increase recursion depth to prevent "maximum recursion depth exceeded" errors
sys.setrecursionlimit(2000)

import os
# Fix for WebView2 accessibility crash - MUST be set before importing webview
os.environ["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = "--disable-features=Accessibility"

import logging
from backend.utils.logger import setup_logger

import webview
import random
import time
import ctypes
from backend.utils.window_manager import WindowManager
from backend.managers.settings import SettingsManager
from backend.managers.iperf import IperfManager
from backend.managers.ping import PingManager
from backend.managers.version import VersionManager
from backend.managers.rtp import RtpManager
from backend.managers.ba import BaManager
from backend.managers.automation import AutomationManager
from backend.managers.wireless_capture import WirelessCaptureManager

class Api:
    def __init__(self):
        if getattr(sys, 'frozen', False):
            # If frozen (exe), the base dir is where the executable lives
            self.base_dir = os.path.dirname(sys.executable)
        else:
            # If script, the base dir is the parent of backend/
            self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            
        self._window_manager = WindowManager()
        
        # Initialize Logger with API reference for frontend communication
        setup_logger(self)
        
        # Initialize Managers
        self._settings_manager = SettingsManager(self.base_dir)
        self._iperf_manager = IperfManager(self.base_dir)
        self._ping_manager = PingManager(self.base_dir)
        self._version_manager = VersionManager(self.base_dir)
        self._rtp_manager = RtpManager(self.base_dir)
        self._ba_manager = BaManager(self.base_dir)
        self._automation_manager = AutomationManager(self.base_dir)
        self._wireless_capture_manager = WirelessCaptureManager(self.base_dir)

    def set_window(self, window):
        """Set the global window reference."""
        self._window_manager.set_window(window)

    def log_message(self, level, message, source="Frontend"):
        """Log a message from the frontend."""
        if level.lower() == 'error':
            logging.error(f"[{source}] {message}")
        elif level.lower() == 'warn':
            logging.warning(f"[{source}] {message}")
        else:
            logging.info(f"[{source}] {message}")
        return True

    def open_tool_window(self, tool_id):
        """Open a specific tool in a new independent window."""
        try:
            entry = get_entrypoint()
            # Use hash to pass the tool ID to the frontend
            url = f"{entry}#tool={tool_id}"
            
            # Create a new window
            # We pass 'self' as js_api so the new window shares the same backend instance
            new_window = webview.create_window(
                f'Tool: {tool_id}', 
                url=url,
                js_api=self,
                width=1000, 
                height=700
            )
            
            # Register the new window with the manager so it receives events
            self._window_manager.add_window(new_window)
            return True
        except Exception as e:
            logging.error(f"Failed to open tool window: {e}")
            return False

    def is_admin(self):
        """Check if the application is running with admin privileges."""
        try:
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        except:
            return False

    def request_admin(self):
        """Request to restart the application with admin privileges."""
        logging.info("request_admin called!")
        if self.is_admin():
            logging.info("Already admin.")
            return True
        
        logging.info("Not admin, attempting to elevate...")
        try:
            # Get the script path
            script = os.path.abspath(sys.argv[0])
            params = " ".join(sys.argv[1:])
            
            # Execute with runas
            if not getattr(sys, 'frozen', False):
                # Running as python script
                # ShellExecuteW(hwnd, operation, file, parameters, directory, showCmd)
                ret = ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, f'"{script}" {params}', None, 1)
            else:
                # Running as executable
                ret = ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, params, None, 1)
            
            # If successful (ret > 32), close current app
            if int(ret) > 32:
                # Try to close all windows
                for window in list(self._window_manager.windows):
                    window.destroy()
                sys.exit(0)
                return True
            else:
                return False
        except Exception as e:
            logging.error(f"Failed to request admin: {e}")
            return False

    # --- Settings ---
    def get_settings(self):
        return self._settings_manager.get_settings()

    def save_setting(self, key, value):
        return self._settings_manager.save_setting(key, value)

    # --- Versions ---
    def get_versions(self):
        return self._version_manager.get_versions()

    # --- Graph / Mock Data ---
    def get_initial_graph(self):
        """Return some initial nodes and edges for the editor."""
        return {
            "nodes": [
                {"id": "1", "type": "input", "data": {"label": "Data Source"}, "position": {"x": 250, "y": 5}},
                {"id": "2", "type": "default", "data": {"label": "Process A"}, "position": {"x": 100, "y": 100}},
                {"id": "3", "type": "default", "data": {"label": "Process B"}, "position": {"x": 400, "y": 100}},
                {"id": "4", "type": "output", "data": {"label": "Output"}, "position": {"x": 250, "y": 200}},
            ],
            "edges": [
                {"id": "e1-2", "source": "1", "target": "2"},
                {"id": "e1-3", "source": "1", "target": "3"},
                {"id": "e2-4", "source": "2", "target": "4"},
                {"id": "e3-4", "source": "3", "target": "4"},
            ]
        }

    def get_chart_data(self):
        """Return random data for the chart."""
        labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
        data = [random.randint(10, 100) for _ in range(6)]
        return {"labels": labels, "datasets": [{"label": "Task Load", "data": data, "borderColor": "rgb(75, 192, 192)", "tension": 0.1}]}

    def execute_task(self, task_id):
        """Simulate a backend task execution."""
        print(f"Executing task {task_id}...")
        time.sleep(1)
        return {"status": "success", "result": f"Task {task_id} completed at {time.strftime('%H:%M:%S')}"}

    # --- iPerf Integration ---
    def get_iperf_versions(self):
        return self._iperf_manager.get_versions()

    def stop_iperf(self, instance_id):
        return self._iperf_manager.stop(instance_id)

    def run_iperf(self, config):
        return self._iperf_manager.run(config)

    # --- Ping Integration ---
    def stop_ping(self, instance_id):
        logging.info(f"Stopping ping: {instance_id}")
        return self._ping_manager.stop(instance_id)

    def run_ping(self, config):
        logging.info(f"Running ping with config: {config}")
        return self._ping_manager.run(config)

    # --- RTP Analysis ---
    def list_pcap_files(self):
        return self._rtp_manager.list_files()

    def detect_rtp_flow(self, filename):
        return self._rtp_manager.auto_detect_flow(filename)

    def analyze_rtp(self, filename, sport, dport):
        return self._rtp_manager.analyze({"filename": filename, "sport": sport, "dport": dport})

    # --- BA Analysis ---
    def detect_ba_flow(self, filename):
        return self._ba_manager.auto_detect_ba_flows(filename)

    def analyze_ba(self, filename, sa, da, tid):
        return self._ba_manager.analyze_ba(filename, sa, da, tid)

    # --- Automation ---
    def get_windows(self):
        return self._automation_manager.get_windows()

    def start_recording(self, window_title, profile_name='default', drag_threshold=10):
        return self._automation_manager.start_recording(window_title, profile_name, drag_threshold)

    def stop_recording(self):
        return self._automation_manager.stop_recording()

    def run_automation_task(self, task_config):
        return self._automation_manager.run_task(task_config)

    def stop_automation_task(self):
        return self._automation_manager.stop_task()

    def save_automation_library(self, library_data):
        return self._automation_manager.save_library(library_data)

    def get_automation_library(self):
        return self._automation_manager.get_library()

    def list_automation_profiles(self):
        return self._automation_manager.list_profiles()

    def save_automation_profile(self, name, data):
        return self._automation_manager.save_profile(name, data)

    def load_automation_profile(self, name):
        return self._automation_manager.load_profile(name)

    def delete_automation_profile(self, name):
        return self._automation_manager.delete_profile(name)

    # Script API
    def list_scripts(self, profile_name='default'):
        return self._automation_manager.list_scripts(profile_name)

    def save_script(self, name, data, profile_name='default'):
        return self._automation_manager.save_script(name, data, profile_name)

    def load_script(self, name, profile_name='default'):
        return self._automation_manager.load_script(name, profile_name)

    def delete_script(self, name, profile_name='default'):
        return self._automation_manager.delete_script(name, profile_name)


    # Composite Script API
    def list_composite_scripts(self, profile_name='default'):
        return self._automation_manager.list_composite_scripts(profile_name)

    def save_composite_script(self, name, data, profile_name='default'):
        return self._automation_manager.save_composite_script(name, data, profile_name)

    def load_composite_script(self, name, profile_name='default'):
        return self._automation_manager.load_composite_script(name, profile_name)

    def delete_composite_script(self, name, profile_name='default'):
        return self._automation_manager.delete_composite_script(name, profile_name)

    def run_script(self, script_name, task_library, action_library, target_window=None, profile_name='default', background_mode=False, simulate_drag=False):
        return self._automation_manager.run_script(script_name, task_library, action_library, target_window, profile_name, background_mode, simulate_drag)

    def run_composite_script(self, composite_name, task_library, action_library, target_window=None, profile_name='default', background_mode=False, simulate_drag=False):
        return self._automation_manager.run_composite_script(composite_name, task_library, action_library, target_window, profile_name, background_mode, simulate_drag)


    def stop_script(self):
        return self._automation_manager.stop_script()

    def get_automation_status(self):
        return self._automation_manager.get_script_status()


    # --- Wireless Capture ---
    def capture_list_interfaces(self, config=None):
        logging.info(f"DEBUG: Calling scan_interfaces_safe with config type: {type(config)}")
        return self._wireless_capture_manager.scan_interfaces_safe(config)

    def capture_start(self, config):
        return self._wireless_capture_manager.start_capture(config)

    def capture_stop(self):
        return self._wireless_capture_manager.stop_capture()
        
    def capture_get_status(self):
        return self._wireless_capture_manager.get_status()

    def capture_get_hosts(self):
        return self._wireless_capture_manager.get_hosts()

    def capture_save_host(self, host_data):
        return self._wireless_capture_manager.save_host(host_data)

    def capture_delete_host(self, ip):
        return self._wireless_capture_manager.delete_host(ip)

    def capture_scan_remote(self, config):
        return self._wireless_capture_manager.scan_remote_interfaces(config)

    def capture_open_folder(self):
        return self._wireless_capture_manager.open_capture_folder()

    def capture_set_mode(self, config):
        return self._wireless_capture_manager.set_interface_mode(config)
        
    def capture_set_channel(self, config):
        return self._wireless_capture_manager.set_channel(config)

    def capture_connect_wifi(self, config):
        return self._wireless_capture_manager.connect_wifi(config)

    # --- QoS / BlockAck Analysis ---
    def ba_detect_flows(self, filename):
        """Auto-detect QoS/BA flows in a pcap file."""
        return self._ba_manager.auto_detect_ba_flows(filename)

    def ba_browse_file(self):
        """Open a file dialog to select a pcap file."""
        file_types = ('PCAP Files (*.pcap;*.pcapng)', 'All files (*.*)')
        # Access the current window via the manager if possible, or use the global class method (less ideal)
        # But webview.windows[0] usually works if we have one main window
        if len(self._window_manager.windows) > 0:
            window = self._window_manager.windows[0] 
            result = window.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False, file_types=file_types)
            if result:
                return result[0]
        return None

    def ba_analyze_ba(self, filename, sa, da, tid):
        """Analyze a specific flow (SA->DA, TID)."""
        return self._ba_manager.analyze_ba(filename, sa, da, tid)
        
    def ba_get_files(self):
        """List available pcap files."""
        # Helper to list files in the pcap directory
        data_dir = os.path.join(self.base_dir, 'backend', 'data', 'pcap')
        if not os.path.exists(data_dir):
            return []
        
        files = [f for f in os.listdir(data_dir) if f.endswith('.pcap') or f.endswith('.pcapng')]
        return files



def get_entrypoint():
    """Determine the entry point file."""
    if getattr(sys, 'frozen', False):
        # Running in a PyInstaller bundle (exe)
        base_dir = sys._MEIPASS
        # In the frozen bundle, 'dist' is at the root level because of --add-data
        return os.path.join(base_dir, 'dist', 'index.html')

    # Running in a real app or dev environment
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, 'dist', 'index.html')

if __name__ == '__main__':
    api = Api()
    entry = get_entrypoint()
    
    window = webview.create_window(
        'Network Analysis Platform', 
        url=entry,
        js_api=api,
        width=1200, 
        height=800
    )
    
    api.set_window(window)
    
    # Enable debug to see logs in console/file
    webview.start(debug=True)
