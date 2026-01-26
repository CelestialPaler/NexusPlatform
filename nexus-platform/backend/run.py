import os
import sys
import threading
import webview
import logging
from flask import Flask
from backend.managers.automation import AutomationManager
from backend.managers.ba import BaManager
from backend.managers.rtp import RtpManager
from backend.managers.ping import PingManager
import os

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class NexusAPI:
    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.automation = AutomationManager()
        self.ba_manager = BaManager(base_dir)
        self.rtp_manager = RtpManager(base_dir)
        self.ping_manager = PingManager(base_dir)
        self._window = None

    def set_window(self, window):
        self._window = window

    def _dispatch(self, event_name, data):
        if self._window:
            self._window.evaluate_js(f"window.dispatchEvent(new CustomEvent('{event_name}', {{ detail: {data} }}))")
            # Or use verify webview event bus

    # --- Ping API ---
    def run_ping(self, config):
        def callback(event, payload):
            if self._window:
                # Need to use specific pywebview mechanism or js evaluation
                # But PyWebView 5.0 typically uses window.pywebview.api.emit? No.
                # Just use evaluate_js to trigger custom event
                # We need to serialize payload safely
                import json
                json_payload = json.dumps(payload)
                self._window.evaluate_js(f"window.dispatchEvent(new CustomEvent('{event}', {{ detail: {json_payload} }}))")
        
        return self.ping_manager.run_ping(config, callback)

    def stop_ping(self, ping_id):
        return self.ping_manager.stop_ping(ping_id)

    # --- Automation API ---
    def get_automation_status(self):
        return self.automation.get_status()

    def is_admin(self):
        try:
            import ctypes
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        except:
            return False

    def request_admin(self):
        # Implementation to restart as admin
        pass

    def get_open_windows(self):
        # Implementation to list windows
        return []

    def log_message(self, message, level='INFO'):
        print(f"[Frontend {level}] {message}")

def start_backend():
    # Flask app if needed for static serving, 
    # but PyWebView might serve directly or user uses Vite dev server
    pass

def main():
    api = NexusAPI()
    
    # Determine URL (Dev vs Prod)
    url = 'http://localhost:5173' # Default to dev for now as per context
    
    window = webview.create_window(
        'Nexus Network Analysis Platform', 
        url,
        js_api=api,
        width=1400, 
        height=900
    )
    api.set_window(window)
    webview.start(debug=True)

if __name__ == '__main__':
    main()
