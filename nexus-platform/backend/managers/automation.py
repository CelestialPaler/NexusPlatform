from backend.managers.base import BaseManager
from backend.automation.window_manager import WindowManager as AutomationWindowManager
from backend.automation.recorder import Recorder
from backend.automation.action_engine import ActionEngine
import logging
import threading
import json
import os
import time
import datetime
import queue
import random
import shutil
import pygetwindow as gw

class ScriptRunner:
    def __init__(self, manager, script_data, task_library, logger_callback, target_window=None):
        self.manager = manager
        self.script_data = script_data
        self.task_library = task_library # List of task nodes
        # We ignore the passed logger_callback and use the standard logger
        self.logger = logging.getLogger("Automation.ScriptRunner")
        self.target_window = target_window
        self.stop_event = threading.Event()
        self.task_queue = queue.Queue()
        self.queued_tasks_info = [] # For visualization
        self.current_task_info = None # For visualization
        self.stats = {'completed': 0, 'failed': 0}
        self.running = False
        self.threads = []
        self.completed_tasks = set() # Set of task IDs that have completed

    def get_status(self):
        return {
            'running': self.running,
            'queue': list(self.queued_tasks_info), # Copy
            'current': self.current_task_info,
            'stats': self.stats
        }

    def _enqueue_task(self, task_conf, trigger_type="unknown"):
        # Create a wrapper to track this specific execution instance
        instance_id = f"{task_conf.get('id')}_{int(time.time()*1000)}_{random.randint(0,999)}"
        task_info = {
            'instanceId': instance_id,
            'taskId': task_conf.get('taskId'),
            'taskName': task_conf.get('taskName'),
            'triggerType': trigger_type,
            'queuedAt': time.time()
        }
        
        # Add to visualization list
        self.queued_tasks_info.append(task_info)
        
        # Put wrapper in queue
        self.task_queue.put({'conf': task_conf, 'info': task_info})

    def start(self):
        self.running = True
        self.stop_event.clear()
        self.stats = {'completed': 0, 'failed': 0}
        self.queued_tasks_info = []
        self.current_task_info = None
        self.logger.info("Script started.")
        
        # Start Queue Processor
        qp = threading.Thread(target=self._process_queue)
        qp.start()
        self.threads.append(qp)

        # Initialize Triggers
        for task_conf in self.script_data.get('tasks', []):
            trigger = task_conf.get('trigger', {})
            t_type = trigger.get('type')
            
            if t_type == 'periodic':
                t = threading.Thread(target=self._periodic_trigger, args=(task_conf,))
                t.start()
                self.threads.append(t)
            elif t_type == 'time':
                t = threading.Thread(target=self._time_trigger, args=(task_conf,))
                t.start()
                self.threads.append(t)
            elif t_type == 'aligned':
                t = threading.Thread(target=self._aligned_trigger, args=(task_conf,))
                t.start()
                self.threads.append(t)
            elif t_type == 'random':
                t = threading.Thread(target=self._random_trigger, args=(task_conf,))
                t.start()
                self.threads.append(t)
            elif t_type == 'once':
                # Execute immediately (once)
                self.logger.info(f"Triggering ONCE task: {task_conf.get('taskName')}")
                self._enqueue_task(task_conf, trigger_type="once")
            # 'event' triggers are checked in _process_queue after task completion

    def stop(self):
        self.running = False
        self.stop_event.set()
        self.logger.info("Stopping script...")

    def _find_task_in_library(self, task_id):
        # Recursive search
        def search(nodes):
            for node in nodes:
                if node.get('id') == task_id:
                    return node
                if node.get('children'):
                    found = search(node['children'])
                    if found: return found
            return None
        return search(self.task_library)

    def _periodic_trigger(self, task_conf):
        interval = float(task_conf['trigger'].get('interval', 10))
        count = int(task_conf['trigger'].get('count', 1))
        is_infinite = task_conf['trigger'].get('infinite', False) or count == 0
        task_id = task_conf.get('taskId')
        
        i = 0
        while not self.stop_event.is_set():
            if not is_infinite and i >= count:
                break

            display_count = f"{i+1}/{'∞' if is_infinite else count}"
            self.logger.info(f"Triggering periodic task: {task_conf.get('taskName')} ({display_count})")
            self._enqueue_task(task_conf, trigger_type="periodic")
            
            # Wait for interval
            start_wait = time.time()
            while time.time() - start_wait < interval:
                if self.stop_event.is_set(): return
                time.sleep(0.1)
            
            i += 1

    def _random_trigger(self, task_conf):
        t_min = float(task_conf['trigger'].get('min', 5))
        t_max = float(task_conf['trigger'].get('max', 15))
        
        while not self.stop_event.is_set():
            # Random wait
            if t_max < t_min: t_max = t_min
            wait_time = random.uniform(t_min, t_max)
            
            start_wait = time.time()
            while time.time() - start_wait < wait_time:
                if self.stop_event.is_set(): return
                time.sleep(0.1)
            
            self.logger.info(f"Triggering random task: {task_conf.get('taskName')}")
            self._enqueue_task(task_conf, trigger_type="random")

    def _time_trigger(self, task_conf):
        target_time_str = task_conf['trigger'].get('time') # "HH:MM:SS"
        if not target_time_str: return
        
        while not self.stop_event.is_set():
            now = datetime.datetime.now()
            target_time = datetime.datetime.strptime(target_time_str, "%H:%M:%S").replace(
                year=now.year, month=now.month, day=now.day
            )
            
            # If target is in past, assume tomorrow? Or just ignore if passed?
            # User said "Specific time". Let's assume if it's within a small window or future.
            # Simple logic: Check every second if current time matches target time (ignoring seconds precision issues)
            
            if now >= target_time and (now - target_time).total_seconds() < 1.5:
                self.logger.info(f"Triggering time task: {task_conf.get('taskName')}")
                self._enqueue_task(task_conf, trigger_type="time")
                break # Run once
            
            time.sleep(1)

    def _aligned_trigger(self, task_conf):
        """Triggers at intervals aligned to a base time."""
        base_time_str = task_conf['trigger'].get('baseTime', "00:00")
        interval_minutes = int(task_conf['trigger'].get('interval', 5))
        
        if interval_minutes <= 0: return

        while not self.stop_event.is_set():
            now = datetime.datetime.now()
            
            # Parse base time for today
            try:
                base_dt = datetime.datetime.strptime(base_time_str, "%H:%M").replace(
                    year=now.year, month=now.month, day=now.day, second=0, microsecond=0
                )
            except ValueError:
                # Try with seconds if user entered HH:MM:SS manually? 
                # Frontend sends HH:MM usually. Fallback to 00:00 if fail.
                base_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)

            # Calculate next trigger time
            # next_time = base + k * interval
            # We want smallest k such that base + k*interval > now
            
            interval_seconds = interval_minutes * 60
            diff_seconds = (now - base_dt).total_seconds()
            
            if diff_seconds < 0:
                # Base time is in future (e.g. base=23:00, now=10:00)
                # Wait for base time? Or treat base as "start of alignment grid"?
                # Usually alignment grid implies periodic from base.
                # If base > now, next trigger is base.
                next_trigger = base_dt
            else:
                # Base is in past. Calculate next slot.
                # k = floor(diff / interval) + 1
                k = int(diff_seconds // interval_seconds) + 1
                next_trigger = base_dt + datetime.timedelta(seconds=k * interval_seconds)
            
            wait_seconds = (next_trigger - now).total_seconds()
            
            self.logger.info(f"Aligned Trigger '{task_conf.get('taskName')}': Next run at {next_trigger.strftime('%H:%M:%S')} (in {wait_seconds:.1f}s)")
            
            # Wait until next trigger
            # Use interruptible sleep
            end_wait = time.time() + wait_seconds
            while time.time() < end_wait:
                if self.stop_event.is_set(): return
                time.sleep(min(1, end_wait - time.time()))
            
            if self.stop_event.is_set(): return
            
            # Double check time (optional, but good for precision)
            self.logger.info(f"Triggering aligned task: {task_conf.get('taskName')}")
            self._enqueue_task(task_conf, trigger_type="aligned")
            
            # Wait a bit to avoid double trigger if loop is fast
            time.sleep(1)

    def _check_event_triggers(self, completed_task_conf):
        # Check if any task is waiting for this completed_task
        completed_id = completed_task_conf.get('id') # The unique ID in the script list
        
        for task_conf in self.script_data.get('tasks', []):
            trigger = task_conf.get('trigger', {})
            if trigger.get('type') == 'event':
                if trigger.get('sourceTaskId') == completed_id:
                    self.logger.info(f"Triggering event task: {task_conf.get('taskName')} (after {completed_task_conf.get('taskName')})")
                    self._enqueue_task(task_conf, trigger_type="event")

    def _process_queue(self):
        while not self.stop_event.is_set() or not self.task_queue.empty():
            try:
                item = self.task_queue.get(timeout=1)
                if isinstance(item, dict) and 'conf' in item and 'info' in item:
                    task_conf = item['conf']
                    task_info = item['info']
                else:
                    task_conf = item
                    task_info = None
            except queue.Empty:
                continue
                
            if self.stop_event.is_set(): break

            # Update Visualization State
            if task_info:
                self.queued_tasks_info = [t for t in self.queued_tasks_info if t['instanceId'] != task_info['instanceId']]
                self.current_task_info = task_info
                self.current_task_info['startedAt'] = time.time()

            # Execute Task
            lib_task = self._find_task_in_library(task_conf.get('taskId'))
            if not lib_task:
                self.logger.error(f"Error: Task {task_conf.get('taskName')} not found in library.")
                self.stats['failed'] += 1
                self.current_task_info = None
                continue

            # DEBUG LOG
            seq_len = len(lib_task.get('sequence', []))
            self.logger.debug(f"DEBUG: Found task '{lib_task.get('name')}' with {seq_len} actions.")
            if seq_len == 0:
                 self.logger.debug(f"DEBUG: Task content: {lib_task}")

            self.logger.info(f"Executing task: {task_conf.get('taskName')}")
            
            window_title = self.target_window or self.script_data.get('settings', {}).get('targetWindow')
            if not window_title:
                self.logger.error("Error: No target window configured for script.")
                self.stats['failed'] += 1
                self.current_task_info = None
                continue

            wm = AutomationWindowManager(window_title)
            if not wm.find_window():
                self.logger.error(f"Error: Window '{window_title}' not found.")
                self.stats['failed'] += 1
                self.current_task_info = None
                continue

            engine_config = {
                'sequence': lib_task.get('sequence', []),
                'settings': {
                    'loop_count': 1, # Script tasks run once per trigger
                    'global_delay': self.script_data.get('settings', {}).get('globalDelay', 1.0),
                    'background_mode': self.script_data.get('settings', {}).get('backgroundMode', False)
                },
                'tasks': [],
                'library': self.task_library # Pass the full library (tasks + actions)
            }
            
            # Use a lambda to adapt the logger callback if ActionEngine still uses it
            # But better to update ActionEngine to use logging too.
            # For now, we pass a lambda that logs to our logger
            engine_logger = lambda msg: self.logger.info(msg)
            
            engine = ActionEngine(wm, engine_config, stop_event=self.stop_event, logger_callback=engine_logger)
            try:
                # Use execute_task directly to pass the correct task name
                engine.execute_task(task_conf.get('taskName'), lib_task.get('sequence', []), loop_count=1)
                self.logger.info(f"Task finished: {task_conf.get('taskName')}")
                self.completed_tasks.add(task_conf.get('id'))
                self.stats['completed'] += 1
                self._check_event_triggers(task_conf)
            except Exception as e:
                self.logger.error(f"Task failed: {task_conf.get('taskName')} - {str(e)}")
                self.stats['failed'] += 1
            finally:
                self.current_task_info = None

class CompositeScriptRunner:
    def __init__(self, manager, composite_data, task_library, action_library, logger_callback, target_window=None, profile_name='default'):
        self.manager = manager
        self.data = composite_data
        self.task_library = task_library
        self.action_library = action_library
        self.logger_callback = logger_callback
        self.target_window = target_window
        self.profile_name = profile_name
        
        self.stop_event = threading.Event()
        self.current_script_name = None
        self.active_runner = None
        self.logger = logging.getLogger("Automation.CompositeRunner")
        self.running = False

    def get_status(self):
        status = {
            'running': self.running,
            'type': 'composite',
            'name': self.data.get('name'),
            'currentScript': self.current_script_name,
            'activeRunnerStatus': self.active_runner.get_status() if self.active_runner else None
        }
        return status

    def start(self):
        self.running = True
        self.stop_event.clear()
        self.logger.info(f"Composite Script '{self.data.get('name')}' started.")
        threading.Thread(target=self._monitor_loop).start()

    def stop(self):
        self.running = False
        self.stop_event.set()
        if self.active_runner:
            self.active_runner.stop()
        self.logger.info("Composite Script stopped.")

    def _monitor_loop(self):
        while not self.stop_event.is_set():
            # Evaluate conditions
            # Sort items by priority (P0 highest -> P8 lowest)
            # We use string comparison "P0" < "P1" ... < "P8"
            items = self.data.get('items', [])
            sorted_items = sorted(items, key=lambda x: x.get('priority', 'P4'))

            matched_item = None
            for item in sorted_items:
                if not item.get('enabled', True): continue
                
                if self._check_conditions(item.get('conditions', []), item.get('conditionTree')):
                    matched_item = item
                    break
            
            if matched_item:
                script_name = matched_item.get('scriptName')
                if self.current_script_name != script_name:
                    self.logger.info(f"Switching to script: {script_name} (Priority: {matched_item.get('priority', 'P4')})")
                    self._switch_script(script_name)
            else:
                if self.current_script_name is not None:
                    self.logger.info("No conditions met. Stopping current script.")
                    self._stop_current_script()
            
            # Sleep in small chunks to allow fast stop
            for _ in range(50): # 5 seconds
                if self.stop_event.is_set(): break
                time.sleep(0.1)

    def _check_conditions(self, conditions, condition_tree=None):
        # Backward compatibility: If condition_tree is missing, use old 'conditions' list (OR logic)
        if not condition_tree:
            if not conditions: return True
            
            # Convert old list to new tree structure on the fly for evaluation
            condition_tree = {
                'type': 'group',
                'operator': 'OR',
                'children': [
                    {
                        'type': 'condition',
                        'conditionType': 'time_range',
                        'days': c.get('days'),
                        'startTime': c.get('startTime'),
                        'endTime': c.get('endTime')
                    } for c in conditions
                ]
            }

        return self._evaluate_node(condition_tree)

    def _evaluate_node(self, node):
        if not node: return False
        
        if node.get('type') == 'group':
            children = node.get('children', [])
            if not children: return False # Empty group is False? Or True? Let's say False.
            
            operator = node.get('operator', 'AND')
            
            if operator == 'AND':
                for child in children:
                    if not self._evaluate_node(child):
                        return False
                return True
            else: # OR
                for child in children:
                    if self._evaluate_node(child):
                        return True
                return False
                
        elif node.get('type') == 'condition':
            ctype = node.get('conditionType')
            now = datetime.datetime.now()
            
            if ctype == 'time_range':
                # Check Days
                days = node.get('days', [])
                if days and len(days) > 0 and now.weekday() not in days:
                    return False
                    
                # Check Time
                start_str = node.get('startTime', "00:00")
                end_str = node.get('endTime', "23:59")
                
                try:
                    if len(start_str) == 5: start_str += ":00"
                    if len(end_str) == 5: end_str += ":59"
                    
                    start_t = datetime.datetime.strptime(start_str, "%H:%M:%S").time()
                    end_t = datetime.datetime.strptime(end_str, "%H:%M:%S").time()
                    current_time = now.time()
                    
                    if start_t <= end_t:
                        return start_t <= current_time <= end_t
                    else:
                        return current_time >= start_t or current_time <= end_t
                except:
                    return False

            elif ctype == 'aligned':
                # Aligned Interval: True if within [base + k*interval, base + k*interval + duration]
                try:
                    interval_min = int(node.get('interval', 5))
                    duration_sec = int(node.get('duration', 60))
                    base_str = str(node.get('baseTime', "00:00"))
                
                    if len(base_str) == 5: base_str += ":00"
                    base_dt = datetime.datetime.strptime(base_str, "%H:%M:%S").replace(
                        year=now.year, month=now.month, day=now.day
                    )
                    
                    # Calculate seconds from base
                    diff = (now - base_dt).total_seconds()
                    interval_sec = interval_min * 60
                    
                    # Normalize diff to be positive relative to some past alignment
                    mod = diff % interval_sec
                    return mod < duration_sec
                except Exception as e:
                    print(f"Error evaluating aligned condition: {e}")
                    return False

            elif ctype == 'interval':
                # Periodic Interval: Aligned to 00:00:00 of today
                try:
                    interval_min = int(node.get('interval', 10))
                    duration_sec = int(node.get('duration', 60))
                    
                    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    diff = (now - midnight).total_seconds()
                    interval_sec = interval_min * 60
                    
                    mod = diff % interval_sec
                    return mod < duration_sec
                except Exception as e:
                    print(f"Error evaluating interval condition: {e}")
                    return False

        return False

    def _switch_script(self, script_name):
        self._stop_current_script()
        
        # Load script data
        script_data = self.manager.load_script(script_name, self.profile_name)
        if 'status' in script_data and script_data['status'] == 'error':
            self.logger.error(f"Failed to load script {script_name}")
            return

        # Inherit settings from composite script
        if 'settings' not in script_data:
            script_data['settings'] = {}
        
        # Inherit background mode and simulate drag if not explicitly set in script (or override?)
        # Usually composite settings override individual script settings for consistency
        if 'settings' in self.data:
            script_data['settings']['backgroundMode'] = self.data['settings'].get('backgroundMode', False)
            script_data['settings']['simulateDrag'] = self.data['settings'].get('simulateDrag', False)

        # Create and start runner
        full_library = self.task_library + self.action_library
        self.active_runner = ScriptRunner(self.manager, script_data, full_library, self.logger_callback, self.target_window)
        self.active_runner.start()
        self.current_script_name = script_name

    def _stop_current_script(self):
        if self.active_runner:
            self.active_runner.stop()
            self.active_runner = None
        self.current_script_name = None

class AutomationManager(BaseManager):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self.recorder = None
        self.current_window_manager = None
        self.action_engine = None
        self.script_runner = None
        self.stop_event = threading.Event()
        
        # Data paths
        self.data_dir = os.path.join(base_dir, 'data', 'automation')
        os.makedirs(self.data_dir, exist_ok=True)
        self.library_path = os.path.join(self.data_dir, 'library.json')
        self.profiles_dir = os.path.join(self.data_dir, 'profiles')
        os.makedirs(self.profiles_dir, exist_ok=True)
        self.scripts_dir = os.path.join(self.data_dir, 'scripts')
        os.makedirs(self.scripts_dir, exist_ok=True)

    def get_script_status(self):
        if self.script_runner:
            return self.script_runner.get_status()
        return None

    def get_windows(self):
        try:
            windows = [w.title for w in gw.getAllWindows() if w.title]
            return list(set(windows))
        except Exception as e:
            return []

    def _get_profile_dir(self, name):
        return os.path.join(self.profiles_dir, name)

    def _get_profile_path(self, name):
        return os.path.join(self._get_profile_dir(name), 'profile.json')

    def start_recording(self, window_title, profile_name='default', drag_threshold=10):
        self.current_window_manager = AutomationWindowManager(window_title)
        if not self.current_window_manager.find_window():
            return {'status': 'error', 'message': f'Window "{window_title}" not found'}
            
        try:
            self.current_window_manager.activate_window()
        except Exception as e:
            print(f"Warning: Could not activate window: {e}")

        # Use profile dir for output
        profile_dir = self._get_profile_dir(profile_name)
        recordings_dir = os.path.join(profile_dir, 'recordings')
        os.makedirs(recordings_dir, exist_ok=True)
        
        self.recorder = Recorder(self.current_window_manager, output_dir=recordings_dir, logger_callback=self._log_to_frontend, drag_threshold=drag_threshold)
        
        try:
            self.recorder.start_recording()
            return {'status': 'started'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def stop_recording(self):
        if self.recorder:
            result = self.recorder.stop_recording()
            self.recorder = None
            # result is { sequence, video_file }
            return {'status': 'stopped', 'sequence': result['sequence'], 'video_file': result.get('video_file')}
        return {'status': 'error', 'message': 'Not recording'}

    def run_task(self, task_config):
        # task_config: { window_title: str, actions: list, loop_count: int, ... }
        window_title = task_config.get('window_title')
        if not window_title:
             return {'status': 'error', 'message': 'Window title required'}
             
        wm = AutomationWindowManager(window_title)
        if not wm.find_window():
             return {'status': 'error', 'message': f'Window "{window_title}" not found'}
             
        self.stop_event.clear()
        
        # Construct config for ActionEngine
        engine_config = {
            'sequence': task_config.get('actions', []),
            'settings': {
                'loop_count': task_config.get('loop_count', 1),
                'global_delay': task_config.get('global_delay', 1.0),
                'background_mode': task_config.get('background_mode', False),
                'simulateDrag': task_config.get('simulate_drag', False)
            },
            'tasks': [], # Can be populated if we support sub-tasks from library
            'library': task_config.get('library', [])
        }
        
        self.action_engine = ActionEngine(wm, engine_config, stop_event=self.stop_event, logger_callback=self._log_to_frontend, progress_callback=self._on_progress)
        
        # Run in separate thread
        thread = threading.Thread(target=self._run_engine_thread)
        thread.start()
        return {'status': 'started'}

    def _on_progress(self, step_index):
        self.send_to_js({'type': 'automation-progress', 'detail': {'step_index': step_index}})

    def _run_engine_thread(self):
        try:
            self.action_engine.execute_sequence()
            self.send_to_js({'type': 'automation-done', 'detail': {}})
        except Exception as e:
            self.send_to_js({'type': 'automation-error', 'detail': {'message': str(e)}})

    def stop_task(self):
        self.stop_event.set()
        return {'status': 'stopped'}

    def _log_to_frontend(self, message):
        self.send_to_js({'type': 'automation-log', 'detail': {'message': message}})
        # File logging
        try:
            log_dir = os.path.join(self.data_dir, 'logs')
            if not os.path.exists(log_dir):
                os.makedirs(log_dir)
            log_file = os.path.join(log_dir, 'automation.log')
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(f"[{timestamp}] {message}\n")
        except Exception as e:
            print(f"Logging error: {e}")
        
    # Data persistence methods
    def save_library(self, library_data):
        try:
            with open(self.library_path, 'w', encoding='utf-8') as f:
                json.dump(library_data, f, indent=4, ensure_ascii=False)
            return {'status': 'saved'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
        
    def get_library(self):
        if os.path.exists(self.library_path):
            try:
                with open(self.library_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []

    def list_profiles(self):
        if not os.path.exists(self.profiles_dir):
            return []
        profiles = []
        # Scan for directories with profile.json
        if os.path.exists(self.profiles_dir):
            for entry in os.scandir(self.profiles_dir):
                if entry.is_dir() and os.path.exists(os.path.join(entry.path, 'profile.json')):
                    profiles.append(entry.name)
                elif entry.is_file() and entry.name.endswith('.json'):
                    # Legacy file support
                    profiles.append(entry.name[:-5])
        return list(set(profiles))

    def load_profile(self, name):
        profile_dir = self._get_profile_dir(name)
        profile_path = self._get_profile_path(name)
        legacy_path = os.path.join(self.profiles_dir, f"{name}.json")
        
        # 1. Try loading from new structure
        if os.path.exists(profile_path):
            # Cleanup legacy file if it still exists (it means migration happened but file wasn't deleted)
            if os.path.exists(legacy_path):
                try:
                    os.remove(legacy_path)
                    print(f"Cleaned up legacy profile file: {legacy_path}")
                except Exception as e:
                    print(f"Warning: Failed to remove legacy file {legacy_path}: {e}")

            try:
                with open(profile_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                return {'status': 'error', 'message': str(e)}
        
        # 2. Try loading from legacy file and migrate
        if os.path.exists(legacy_path):
            try:
                with open(legacy_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Migration: Create dir and move data
                os.makedirs(profile_dir, exist_ok=True)
                
                # Check for legacy scripts in profiles/{name}/scripts/
                legacy_scripts_dir = os.path.join(self.profiles_dir, name, 'scripts')
                scripts = []
                if os.path.exists(legacy_scripts_dir):
                    for s_file in os.listdir(legacy_scripts_dir):
                        if s_file.endswith('.json'):
                            try:
                                with open(os.path.join(legacy_scripts_dir, s_file), 'r', encoding='utf-8') as sf:
                                    s_data = json.load(sf)
                                    if 'name' not in s_data:
                                        s_data['name'] = s_file[:-5]
                                    scripts.append(s_data)
                            except:
                                pass
                
                if scripts:
                    data['scripts'] = scripts
                
                # Save to new location
                with open(profile_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=4, ensure_ascii=False)
                
                # Remove legacy file after successful migration
                try:
                    os.remove(legacy_path)
                except Exception as e:
                    print(f"Warning: Failed to remove legacy file {legacy_path}: {e}")

                return data
            except Exception as e:
                return {'status': 'error', 'message': f"Migration failed: {str(e)}"}

        return {'status': 'error', 'message': 'Profile not found'}

    def save_profile(self, name, data):
        profile_dir = self._get_profile_dir(name)
        os.makedirs(profile_dir, exist_ok=True)
        profile_path = self._get_profile_path(name)
        
        # Merge with existing scripts if not provided in data
        if 'scripts' not in data:
            existing = {}
            if os.path.exists(profile_path):
                try:
                    with open(profile_path, 'r', encoding='utf-8') as f:
                        existing = json.load(f)
                except:
                    pass
            data['scripts'] = existing.get('scripts', [])

        try:
            with open(profile_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            return {'status': 'success'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def delete_profile(self, name):
        profile_dir = self._get_profile_dir(name)
        legacy_path = os.path.join(self.profiles_dir, f"{name}.json")
        
        success = False
        if os.path.exists(profile_dir):
            try:
                shutil.rmtree(profile_dir)
                success = True
            except Exception as e:
                return {'status': 'error', 'message': str(e)}
        
        if os.path.exists(legacy_path):
            try:
                os.remove(legacy_path)
                success = True
            except Exception as e:
                return {'status': 'error', 'message': str(e)}
                
        if success:
            return {'status': 'success'}
        return {'status': 'error', 'message': 'Profile not found'}

    def list_scripts(self, profile_name='default'):
        data = self.load_profile(profile_name)
        if 'status' in data and data['status'] == 'error':
            return []
        return [s.get('name', 'Unnamed') for s in data.get('scripts', [])]

    def save_script(self, name, script_data, profile_name='default'):
        # Load full profile
        data = self.load_profile(profile_name)
        if 'status' in data and data['status'] == 'error':
            # If profile doesn't exist, create it?
            # For now, assume profile exists or we create a basic one
            data = {'actionLibrary': [], 'taskLibrary': [], 'scripts': [], 'compositeScripts': [], 'settings': {}}
            
        scripts = data.get('scripts', [])
        # Update or add
        found = False
        for i, s in enumerate(scripts):
            if s.get('name') == name:
                scripts[i] = script_data
                found = True
                break
        if not found:
            script_data['name'] = name
            scripts.append(script_data)
            
        data['scripts'] = scripts
        return self.save_profile(profile_name, data)

    def load_script(self, name, profile_name='default'):
        data = self.load_profile(profile_name)
        if 'status' in data and data['status'] == 'error':
            return {'status': 'error', 'message': 'Profile not found'}
            
        for s in data.get('scripts', []):
            if s.get('name') == name:
                return s
        return {'status': 'error', 'message': 'Script not found'}

    def delete_script(self, name, profile_name='default'):
        data = self.load_profile(profile_name)
        if 'status' in data and data['status'] == 'error':
            return {'status': 'error', 'message': 'Profile not found'}
            
        scripts = data.get('scripts', [])
        new_scripts = [s for s in scripts if s.get('name') != name]
        
        if len(scripts) == len(new_scripts):
            return {'status': 'error', 'message': 'Script not found'}
            
        data['scripts'] = new_scripts
        return self.save_profile(profile_name, data)

    # --- Composite Scripts CRUD ---
    def list_composite_scripts(self, profile_name='default'):
        data = self.load_profile(profile_name)
        if 'status' in data and data['status'] == 'error':
            return []
        return [s.get('name', 'Unnamed') for s in data.get('compositeScripts', [])]

    def save_composite_script(self, name, script_data, profile_name='default'):
        data = self.load_profile(profile_name)
        if 'status' in data and data['status'] == 'error':
            data = {'actionLibrary': [], 'taskLibrary': [], 'scripts': [], 'compositeScripts': [], 'settings': {}}
            
        scripts = data.get('compositeScripts', [])
        found = False
        for i, s in enumerate(scripts):
            if s.get('name') == name:
                scripts[i] = script_data
                found = True
                break
        if not found:
            script_data['name'] = name
            scripts.append(script_data)
            
        data['compositeScripts'] = scripts
        return self.save_profile(profile_name, data)

    def load_composite_script(self, name, profile_name='default'):
        data = self.load_profile(profile_name)
        if 'status' in data and data['status'] == 'error':
            return {'status': 'error', 'message': 'Profile not found'}
            
        for s in data.get('compositeScripts', []):
            if s.get('name') == name:
                return s
        return {'status': 'error', 'message': 'Composite Script not found'}

    def delete_composite_script(self, name, profile_name='default'):
        data = self.load_profile(profile_name)
        if 'status' in data and data['status'] == 'error':
            return {'status': 'error', 'message': 'Profile not found'}
            
        scripts = data.get('compositeScripts', [])
        new_scripts = [s for s in scripts if s.get('name') != name]
        
        if len(scripts) == len(new_scripts):
            return {'status': 'error', 'message': 'Composite Script not found'}
            
        data['compositeScripts'] = new_scripts
        return self.save_profile(profile_name, data)

    def run_script(self, script_name, task_library, action_library, target_window=None, profile_name='default', background_mode=False, simulate_drag=False):
        # Load script
        script_data = self.load_script(script_name, profile_name)
        if 'status' in script_data and script_data['status'] == 'error':
            return script_data
            
        if self.script_runner and self.script_runner.running:
            return {'status': 'error', 'message': 'A script is already running'}
            
        # Override background mode from global settings
        if 'settings' not in script_data:
            script_data['settings'] = {}
        script_data['settings']['backgroundMode'] = background_mode
        script_data['settings']['simulateDrag'] = simulate_drag

        # Merge libraries for ScriptRunner
        full_library = task_library + action_library
        
        self.script_runner = ScriptRunner(self, script_data, full_library, self._log_to_frontend, target_window)
        
        # Run in separate thread (ScriptRunner manages its own threads, but start() is non-blocking)
        try:
            self.script_runner.start()
            return {'status': 'started'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def run_composite_script(self, composite_name, task_library, action_library, target_window=None, profile_name='default', background_mode=False, simulate_drag=False):
        # Load composite script
        comp_data = self.load_composite_script(composite_name, profile_name)
        if 'status' in comp_data and comp_data['status'] == 'error':
            return comp_data
            
        if self.script_runner and self.script_runner.running:
            return {'status': 'error', 'message': 'A script is already running'}
            
        # Inject settings into composite data so runners can inherit it
        if 'settings' not in comp_data:
            comp_data['settings'] = {}
        comp_data['settings']['backgroundMode'] = background_mode
        comp_data['settings']['simulateDrag'] = simulate_drag

        # We reuse self.script_runner to hold the composite runner instance
        self.script_runner = CompositeScriptRunner(self, comp_data, task_library, action_library, self._log_to_frontend, target_window, profile_name)
        
        try:
            self.script_runner.start()
            return {'status': 'started'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

    def stop_script(self):
        if self.script_runner:
            self.script_runner.stop()
            self.script_runner = None
            return {'status': 'stopped'}
        return {'status': 'error', 'message': 'No script running'}
