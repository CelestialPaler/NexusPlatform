import importlib
import pkgutil
import inspect
import threading
import traceback
from typing import Dict, Any, Type
from backend.managers.base import BaseManager
# Try importing from installed package, fallback to relative if needed, 
# but considering strict environment it should be installed or in path.
try:
    from nexus_core.interfaces import ITool
    import nexus_core.plugins
except ImportError:
    # Safe fallback for partial environments
    ITool = None
    pass

class UniversalManager(BaseManager):
    """
    The Universal Router for the Dynamic Plugin System.
    Core Philosophy: Platform is Router.
    """
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self._registry: Dict[str, ITool] = {}
        # Scan and load plugins
        self.load_plugins()

    def load_plugins(self):
        """
        Dynamically discover and load all ITool implementations from nexus_core.plugins.
        """
        if ITool is None:
            print("[UniversalManager] Error: nexus_core not found. functionality disabled.")
            return

        print("[UniversalManager] Starting plugin discovery...")
        
        # 1. Walk through the nexus_core.plugins package
        stack = [nexus_core.plugins]
        
        while stack:
            current_pkg = stack.pop()
            if not hasattr(current_pkg, '__path__'):
                continue
                
            for importer, modname, ispkg in pkgutil.iter_modules(current_pkg.__path__, current_pkg.__name__ + "."):
                try:
                    module = importlib.import_module(modname)
                    if ispkg:
                        stack.append(module)
                    else:
                        self._inspect_module_for_tools(module)
                except Exception as e:
                    print(f"[UniversalManager] Failed to import module {modname}: {e}")

        print(f"[UniversalManager] Discovery complete. Loaded {len(self._registry)} tools: {list(self._registry.keys())}")

    def _inspect_module_for_tools(self, module):
        """
        Inspect a module for classes implementing ITool.
        """
        for name, obj in inspect.getmembers(module):
            if inspect.isclass(obj) and issubclass(obj, ITool) and obj is not ITool:
                # Avoid abstract classes (simplistic check, better to check for abstract methods)
                if inspect.isabstract(obj):
                    continue
                
                try:
                    # Instantiate the tool
                    tool_instance = obj(self.base_dir)
                    metadata = tool_instance.get_metadata()
                    tool_id = metadata.get('id')
                    
                    if not tool_id:
                        print(f"[UniversalManager] Warning: Tool {name} has no ID in metadata. Skipping.")
                        continue
                        
                    self._registry[tool_id] = tool_instance
                    print(f"[UniversalManager] Registered tool: {tool_id} from {name}")
                except Exception as e:
                    print(f"[UniversalManager] Failed to instantiate {name}: {e}")

    def invoke(self, tool_id: str, action: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        The Universal Dispatch Interface.
        :param tool_id: The ID of the tool (e.g., 'ping', 'iperf')
        :param action: The action to perform ('run', 'stop', 'get_metadata')
        :param payload: The data dictionary to pass to the tool
        """
        tool = self._registry.get(tool_id)
        if not tool:
            return {"status": "error", "message": f"Tool '{tool_id}' not found."}

        try:
            if action == 'run':
                # Bridge the callback to the frontend
                config = payload
                def bridge_callback(event_type, event_data):
                    self.send_to_js({
                        "type": f"{tool_id}:{event_type}", # Namespaced event
                        "detail": event_data
                    })
                
                # Execute logic (potentially async logic wrapped in thread if needed by tool, 
                # but ITool.run is designed to return immediate status, assuming threading inside or synchronous)
                # But to be safe for UI responsiveness, check if we need to offload.
                # Standard Python tools might block. 
                # For Phase 3, we assume ITool.run is the entry point. 
                # If it's blocking, we might need a thread here.
                # Most existing tools in Nexus seem to thread internally or rely on creating background tasks.
                # However, universal manager should probably guard against blocking main thread.
                
                result = tool.run(config, callback=bridge_callback)
                return result

            elif action == 'stop':
                instance_id = payload.get('instance_id')
                return tool.stop(instance_id)

            elif action == 'get_metadata':
                return tool.get_metadata()
            
            else:
                return {"status": "error", "message": f"Unknown action '{action}'"}

        except Exception as e:
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    def get_all_tools_metadata(self):
        """
        Helper for Frontend to discover available tools.
        """
        return [tool.get_metadata() for tool in self._registry.values()]
