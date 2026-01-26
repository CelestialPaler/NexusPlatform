from backend.utils.window_manager import WindowManager

class BaseManager:
    def __init__(self, base_dir):
        self.base_dir = base_dir
        self.window_manager = WindowManager()

    def send_to_js(self, code):
        self.window_manager.send_message(code)
