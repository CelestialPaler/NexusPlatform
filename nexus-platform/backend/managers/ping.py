from backend.managers.base import BaseManager
import json
try:
    from nexus_core.plugins.network.nexus_ping.tool_v2 import PingTool
except ImportError:
    from nexus_core.plugins.network.nexus_ping.tool_v2 import PingTool

class PingManager(BaseManager):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self.tool = PingTool(base_dir)

    def run(self, config):
        # Called by app.py (PyWebView)
        def callback(event, payload):
            # Send structured object for WindowManager to batch and ProcessEvents to dispatch
            message = {'type': event, 'detail': payload}
            self.send_to_js(message)
        
        return self.tool.run(config, callback=callback)

    def run_ping(self, config, callback_fn=None):
         # Called by run.py
         if callback_fn:
             return self.tool.run(config, callback=callback_fn)
         else:
             return self.run(config)

    def stop(self, ping_id):
        return self.tool.stop(ping_id)

    # Alias for run.py usage consistency if needed
    def stop_ping(self, ping_id):
        return self.stop(ping_id)
