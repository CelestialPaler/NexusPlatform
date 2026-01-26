import os
import json
from backend.managers.base import BaseManager

class VersionManager(BaseManager):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self.versions_file = os.path.join(self.base_dir, 'config', 'versions.json')
        self.versions = self._load_versions()

    def _load_versions(self):
        if os.path.exists(self.versions_file):
            try:
                with open(self.versions_file, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {"app": "0.0.0", "tools": {}}

    def get_versions(self):
        return self.versions
