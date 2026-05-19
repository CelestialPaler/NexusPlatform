from backend.managers.base import BaseManager


class AutomationManager(BaseManager):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self._status = {
            'running': False,
            'queue': [],
            'current': None,
            'stats': {'completed': 0, 'failed': 0},
        }
        self._unsupported = {
            'status': 'unsupported',
            'message': 'Automation is only available on Windows in the current phase.',
        }

    def _unsupported_result(self):
        return dict(self._unsupported)

    def get_script_status(self):
        return dict(self._status)

    def get_windows(self):
        return []

    def start_recording(self, window_title, profile_name='default', drag_threshold=10):
        return self._unsupported_result()

    def stop_recording(self):
        return self._unsupported_result()

    def run_task(self, task_config):
        return self._unsupported_result()

    def stop_task(self):
        return self._unsupported_result()

    def save_library(self, library_data):
        return self._unsupported_result()

    def get_library(self):
        return {'taskLibrary': [], 'actionLibrary': [], 'status': 'unsupported'}

    def list_profiles(self):
        return []

    def save_profile(self, name, data):
        return self._unsupported_result()

    def load_profile(self, name):
        return self._unsupported_result()

    def delete_profile(self, name):
        return self._unsupported_result()

    def list_scripts(self, profile_name='default'):
        return []

    def save_script(self, name, data, profile_name='default'):
        return self._unsupported_result()

    def load_script(self, name, profile_name='default'):
        return self._unsupported_result()

    def delete_script(self, name, profile_name='default'):
        return self._unsupported_result()

    def list_composite_scripts(self, profile_name='default'):
        return []

    def save_composite_script(self, name, data, profile_name='default'):
        return self._unsupported_result()

    def load_composite_script(self, name, profile_name='default'):
        return self._unsupported_result()

    def delete_composite_script(self, name, profile_name='default'):
        return self._unsupported_result()

    def run_script(self, script_name, task_library, action_library, target_window=None, profile_name='default', background_mode=False, simulate_drag=False):
        return self._unsupported_result()

    def run_composite_script(self, composite_name, task_library, action_library, target_window=None, profile_name='default', background_mode=False, simulate_drag=False):
        return self._unsupported_result()

    def stop_script(self):
        return self._unsupported_result()