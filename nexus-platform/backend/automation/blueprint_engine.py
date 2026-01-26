import time
import threading
import logging
import traceback
import subprocess
import platform
import re

logger = logging.getLogger('BlueprintEngine')

class BlueprintEngine:
    def __init__(self, api_context):
        """
        :param api_context: Reference to the main Api class to call UI methods or other utilities.
        """
        self.api = api_context
        self.running = False
        self.stop_event = threading.Event()
        
        # Graph State
        self.nodes = []
        self.edges = []
        self.node_map = {}
        self.adj_list = {} # For Execution Flow: node_id -> [target_node_ids]
        self.data_links = {} # For Data Flow: target_node_id.target_handle -> source_node_id.source_handle
        
        # Runtime State
        self.node_outputs = {} # node_id -> { handle_id: value }
        self.active_threads = []

    def load_graph(self, graph_data):
        """
        Load ReactFlow JSON
        """
        self.nodes = graph_data.get('nodes', [])
        self.edges = graph_data.get('edges', [])
        self.node_map = {n['id']: n for n in self.nodes}
        
        # Build Adjacency and Data Maps
        self.adj_list = {}
        self.data_links = {}
        
        for edge in self.edges:
            src = edge['source']
            tgt = edge['target']
            src_handle = edge['sourceHandle']
            tgt_handle = edge['targetHandle']
            
            # Determine if this is Flow or Data
            # Heuristic: Flow handles usually named 'exec', 'true', 'false', 'out' (if valid flow type)
            # Better heuristic: Check the handle definitions in Frontend.
            # But here we only have JSON.
            # Let's assume handles starting with 'exec', 'true', 'false', 'tick' are flows.
            # Or better: check connection handle type if possible.
            # Since we don't store type in Edge, we infer or rely on naming.
            
            # Convention:
            # Data Inputs: 'in' is flow. Others are data.
            # Data Outputs: 'exec', 'true', 'false' are flow. Others data.
            
            # Wait, in the frontend I defined: 
            # - trigger: outputs=[{id:'exec', type:'flow'}]
            # - action: inputs=[{id:'in', type:'flow'}...], outputs=[{id:'out', type:'flow'}...]
            # - string: outputs=[{id:'val', type:'string'}] -> DATA
            
            # So if target handle is 'in', it's Flow. 'cond' is Data.
            
            is_flow_connection = False
            
            # Check target handle for Flow
            target_node = self.node_map.get(tgt)
            if target_node:
                t_outputs = target_node['data'].get('outputs', [])
                t_inputs = target_node['data'].get('inputs', [])
                
                # Check if target handle id is 'in' (Standard Flow Input)
                if tgt_handle == 'in':
                    is_flow_connection = True
            
            if is_flow_connection:
                if src not in self.adj_list:
                    self.adj_list[src] = {}
                # Support branching: store which handle triggers which node
                self.adj_list[src][src_handle] = tgt
            else:
                # Data Link
                key = f"{tgt}.{tgt_handle}"
                self.data_links[key] = {'node': src, 'handle': src_handle}

        self.node_outputs = {}
        logger.info(f"Graph Loaded: {len(self.nodes)} nodes, {len(self.edges)} edges")

    def run(self):
        """
        Start execution of all entry points (triggers)
        """
        self.running = True
        self.stop_event.clear()
        self.active_threads = []
        
        # clear previous outputs
        self.node_outputs = {}

        # Find Entry Points (type == trigger)
        triggers = [n for n in self.nodes if n['data']['type'] == 'trigger']
        
        for t in triggers:
            # Start a thread for each trigger
            th = threading.Thread(target=self._execute_flow, args=(t,))
            th.start()
            self.active_threads.append(th)
            
        return len(triggers)

    def stop(self):
        self.running = False
        self.stop_event.set()
        
    def _execute_flow(self, start_node):
        """
        Execute a chain of nodes. Handles 'Interval' triggers by looping.
        """
        node_label = start_node['data'].get('label', '')
        is_interval = (node_label == 'Interval')
        # Todo: Get interval from input widget if available
        interval_delay = 2.0 
        
        while self.running and not self.stop_event.is_set():
            # Run one pulse
            self._run_chain_pulse(start_node)
            
            if is_interval:
                time.sleep(interval_delay)
            else:
                break

    def _run_chain_pulse(self, start_node):
        current = start_node
        
        try:
            while current and self.running and not self.stop_event.is_set():
                node_id = current['id']
                node_type = current['data']['type']
                node_label = current['data']['label']
                
                logger.info(f"Exec: {node_label} ({node_id})")
                
                # EXECUTE NODE LOGIC
                next_handle = 'exec' # Default
                
                if node_type == 'trigger':
                    next_handle = self._handle_trigger(current)
                elif node_type == 'action':
                    next_handle = self._handle_action(current)
                elif node_type == 'log':
                    next_handle = self._handle_log(current)
                elif node_type == 'delay':
                    next_handle = self._handle_delay(current)
                elif node_type == 'condition':
                    next_handle = self._handle_condition(current)
                    
                if next_handle is None:
                    break
                    
                # Find Next Node
                if node_id in self.adj_list and next_handle in self.adj_list[node_id]:
                    next_id = self.adj_list[node_id][next_handle]
                    current = self.node_map.get(next_id)
                else:
                    current = None
                    
        except Exception as e:
            logger.error(f"Execution Error: {traceback.format_exc()}")
            self.api_log(f"Error in {current['data']['label'] if current else 'Unknown'}: {str(e)}", level='error')

    # --- Data Resolution ---
    
    def _resolve_input(self, node_id, handle_id):
        """
        Get value for a node's input handle.
        Priority:
        1. Connected link (Data)
        2. Widget value (if configured in JSON)
        """
        key = f"{node_id}.{handle_id}"
        
        if key in self.data_links:
            link = self.data_links[key]
            src_node_id = link['node']
            src_handle = link['handle']
            
            # Check source node type
            src_node = self.node_map.get(src_node_id)
            if not src_node:
                return None
            
            src_type = src_node['data'].get('type')
            
            # If Variable Node, get fresh value
            if src_type in ['string', 'number', 'boolean', 'integer']:
                return src_node['data'].get('value')
                
            # If Action/Other, get Cached Output
            if src_node_id in self.node_outputs:
                return self.node_outputs[src_node_id].get(src_handle)
                
            return None
        
        return None

    def _handle_trigger(self, node):
        # Triggers just pass control
        return 'exec'

    def _handle_action(self, node):
        label = node['data']['label']
        if label == 'Ping':
            # Inputs
            target = self._resolve_input(node['id'], 'ip')
            if not target:
                self.api_log("Ping: No IP provided", "warn")
                return 'out'
                
            # Execute Ping
            self.api_log(f"Pinging {target}...", "info")
            rtt = self._do_ping(str(target))
            
            # Store Outputs
            if node['id'] not in self.node_outputs: self.node_outputs[node['id']] = {}
            self.node_outputs[node['id']]['rtt'] = rtt
            
        return 'out'

    def _handle_log(self, node):
        msg = self._resolve_input(node['id'], 'msg')
        self.api_log(f"Blueprint: {msg}", "success" if msg else "info")
        return 'out'

    def _handle_delay(self, node):
        # Could have 'duration' input
        time.sleep(1.0)
        return 'out'

    def _handle_condition(self, node):
        cond = self._resolve_input(node['id'], 'cond')
        # Ensure boolean
        is_true = bool(cond) 
        # Check string 'true'/'false' just in case
        if isinstance(cond, str):
            is_true = cond.lower() == 'true'
            
        return 'true' if is_true else 'false'

    # --- Helpers ---
    
    def api_log(self, msg, level="info"):
        if self.api and hasattr(self.api, 'log_message'):
            # Thread-safe optional
            print(f"[{level.upper()}] {msg}")
            try:
                # app.py's log_message(level, message, source)
                self.api.log_message(level, msg, source="Blueprint")
            except Exception:
                pass

    def _do_ping(self, host):
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        command = ['ping', param, '1', host]
        try:
            # Windows output handling is messy with encoding
            if platform.system().lower() == 'windows':
                # Use Shell=True and manual parsing for simple "time=Xms"
                result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors='ignore')
                out = result.stdout
                
                # Parse "time=12ms" or "时间=12ms"
                match = re.search(r'(time|时间)[=<](\d+)ms', out, re.IGNORECASE)
                if match:
                    return int(match.group(2))
                return -1 # Timeout/Fail
            else:
                result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                # Parse linux output
                return 0 # Todo
        except:
            return -1
