class NexusError(Exception):
    """Base exception for all Nexus SDK errors."""
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR"):
        self.message = message
        self.code = code
        super().__init__(f"[{code}] {message}")

class NexusPluginError(NexusError):
    """Exception raised by plugins when execution fails."""
    pass

class DataValidationError(NexusError):
    """Exception raised when input/output data fails validation."""
    pass
