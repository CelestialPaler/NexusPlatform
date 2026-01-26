from backend.managers.base import BaseManager
import json
try:
    from nexus_core.plugins.network.nexus_iperf.tool import IperfTool
except ImportError:
    # If installed in editable mode without reinstall, it might still be cached.
    from nexus_core.plugins.network.nexus_iperf.tool import IperfTool

class IperfManager(BaseManager):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self.tool = IperfTool(base_dir)

    def get_versions(self):
        return self.tool.get_versions()

    def stop(self, instance_id):
        return self.tool.stop(instance_id)

    def run(self, config):
        # Bridge Core Callback -> Frontend Event
        def callback(event_type, payload):
            # Send structured object for WindowManager to batch and ProcessEvents to dispatch
            message = {'type': event_type, 'detail': payload}
            self.send_to_js(message)
            
        return self.tool.run(config, callback)
