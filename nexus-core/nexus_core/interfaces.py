from abc import ABC, abstractmethod
from typing import Dict, Any, Callable, Optional

class ITool(ABC):
    """
    Standard Interface for all Nexus Core Tools.
    Ensures compatibility with Plugin System and Blueprint Engine.
    """

    @abstractmethod
    def __init__(self, base_dir: str):
        self.base_dir = base_dir

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """
        Return tool metadata including name, version, inputs, and outputs.
        Used by the Blueprint System to generate nodes.
        """
        pass

    @abstractmethod
    def run(self, config: Dict[str, Any], callback: Optional[Callable[[str, Any], None]] = None) -> Dict[str, Any]:
        """
        Execute the tool.
        :param config: Dictionary of parameters (e.g., {'host': '8.8.8.8'})
        :param callback: Function to report real-time events (event_name, payload)
        :return: Immediate result dictionary (status, pid, etc.)
        """
        pass

    @abstractmethod
    def stop(self, instance_id: str) -> Dict[str, Any]:
        """
        Stop a running instance of the tool.
        """
        pass
