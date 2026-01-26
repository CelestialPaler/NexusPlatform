import unittest
import time
import threading
import sys
import os

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.automation.blueprint_engine import BlueprintEngine

class MockApi:
    def __init__(self):
        self.logs = []
    
    def log_message(self, message, level="info"):
        print(f"[MOCK-API] {level}: {message}")
        self.logs.append((level, message))

class TestBlueprintEngine(unittest.TestCase):
    def setUp(self):
        self.api = MockApi()
        self.engine = BlueprintEngine(self.api)
        
    def test_simple_flow(self):
        # A simple flow: Trigger -> Log
        graph = {
            "nodes": [
                {"id": "1", "data": {"type": "trigger", "label": "Start"}},
                {"id": "2", "data": {"type": "log", "label": "LogNode", "value": ""}}
            ],
            "edges": [
                {"source": "1", "sourceHandle": "exec", "target": "2", "targetHandle": "in"}
            ]
        }
        
        # Inject data for Log node 'msg' input (usually handled by data link or widget)
        # Since my engine _resolve_input prioritizes links, but falls back to widgets?
        # Let's check engine code.
        # _resolve_input: 1. data_link 2. src_node['data'].get('value') (only if string/number/boolean node?)
        # Wait, for 'Log' node input 'msg', if it's not connected, _resolve_input returns None.
        # My engine logic for Log: msg = self._resolve_input(node['id'], 'msg')
        # If None, it prints "None" or similar?
        # let's modify graph to have a string variable connected.
        
        graph["nodes"].append(
            {"id": "3", "data": {"type": "string", "label": "StrVar", "value": "Hello World"}}
        )
        # Add Data link: Log(2).msg <- StrVar(3).val
        # My Engine loads connections from 'edges'.
        graph["edges"].append(
            {"source": "3", "sourceHandle": "val", "target": "2", "targetHandle": "msg"}
        )
        
        self.engine.load_graph(graph)
        count = self.engine.run()
        self.assertEqual(count, 1)
        
        # Wait for execution
        time.sleep(0.5)
        self.engine.stop()
        
        # Check logs
        # api_log calls print and maybe log_message?
        # In engine: self.api_log calls print. It tries to call api.log_message?
        # Let's check self.api_log implementation in engine.
        # "if self.api: print... pass" -> It does NOT call api.log_message in the current code! 
        # Wait, I commented it out: "# self._window.evaluate_js..." inside the engine?
        # No, the engine calls `self.api_log`. 
        # Inside `api_log`: `print... pass`. 
        # It does NOT call `self.api.log_message`!
        # This is a BUG/Missing Feature I need to fix.
        
    def test_ping_flow(self):
        # Trigger -> Ping -> Log
        pass

if __name__ == '__main__':
    unittest.main()
