import os
import json
from backend.managers.base import BaseManager

class SettingsManager(BaseManager):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self.settings_file = os.path.join(self.base_dir, 'config', 'settings.json')
        self.settings = self._load_settings()

    def _load_settings(self):
        if os.path.exists(self.settings_file):
            try:
                with open(self.settings_file, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {"language": "en", "theme": "light"}

    def get_settings(self):
        return self.settings

    def save_setting(self, key, value):
        self.settings[key] = value
        # Ensure config directory exists
        config_dir = os.path.dirname(self.settings_file)
        if not os.path.exists(config_dir):
            os.makedirs(config_dir)
            
        with open(self.settings_file, 'w') as f:
            json.dump(self.settings, f)
        return {"status": "success", "settings": self.settings}
