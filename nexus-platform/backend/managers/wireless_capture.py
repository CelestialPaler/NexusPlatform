from backend.managers.base import BaseManager
try:
    from nexus_core.plugins.wifi.capture.tool import WirelessCaptureTool
except ImportError:
    from nexus_core.plugins.wifi.capture.tool import WirelessCaptureTool

class WirelessCaptureManager(BaseManager):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self.tool = WirelessCaptureTool(base_dir)

    def scan_interfaces_safe(self, config=None):
        return self.tool.scan_interfaces_safe(config)
    
    def start_capture(self, config):
        return self.tool.start_capture(config)

    def stop_capture(self):
        return self.tool.stop_capture()

    def get_status(self):
        return self.tool.get_status()

    def get_hosts(self):
        return self.tool.get_hosts()
    
    def save_host(self, host_data):
        return self.tool.save_host(host_data)
        
    def delete_host(self, ip):
        return self.tool.delete_host(ip)

    def scan_remote_interfaces(self, config):
        return self.tool.scan_remote_interfaces(config)
    
    def open_capture_folder(self):
        return self.tool.open_capture_folder()

    def set_interface_mode(self, config):
        return self.tool.set_interface_mode(config)

    def set_channel(self, config):
        return self.tool.set_channel(config)
        
    def connect_wifi(self, config):
        return self.tool.connect_wifi(config)
