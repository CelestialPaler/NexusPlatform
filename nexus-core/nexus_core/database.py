"""
Nexus Analyzer Core - Database Manager
Handles SQLite interactions for trace data.
"""
import sqlite3
import os

class DatabaseManager:
    def __init__(self, output_dir):
        self.db_path = os.path.join(output_dir, "trace.sqlite")
        self.conn = None

    def connect(self):
        self.conn = sqlite3.connect(self.db_path)
    
    def close(self):
        if self.conn:
            self.conn.close()
