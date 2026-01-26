"""
Nexus Analyzer Core - Utilities
"""
import json
import os

def save_summary(output_dir, data):
    with open(os.path.join(output_dir, "summary.json"), 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def setup_logger():
    # TODO: Configure logging
    pass
