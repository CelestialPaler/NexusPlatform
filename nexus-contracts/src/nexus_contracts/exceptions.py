class NexusError(Exception):
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR"):
        self.message = message
        self.code = code
        super().__init__(f"[{code}] {message}")


class NexusPluginError(NexusError):
    pass


class DataValidationError(NexusError):
    pass