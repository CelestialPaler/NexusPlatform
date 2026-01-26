import time
import random
import pyautogui
import threading
import win32gui
import win32con
from datetime import datetime
from typing import List, Dict, Any, Optional, Callable
from .window_manager import WindowManager
from .visualizer import ActionVisualizer

class ActionEngine:
    def __init__(self, window_manager: WindowManager, config: Dict[str, Any], stop_event: Optional[threading.Event] = None, logger_callback: Optional[Callable[[str], None]] = None, progress_callback: Optional[Callable[[int], None]] = None):
        self.wm = window_manager
        self.config = config
        # Support both old and new config structures
        self.settings = config.get('settings', {})
        self.sequence = config.get('sequence', [])
        
        # Init Visualizer
        enable_viz = self.settings.get('enableVisualization', False)
        self.visualizer = ActionVisualizer(enabled=enable_viz)
        
        self.stop_event = stop_event
        self.logger_callback = logger_callback
        self.progress_callback = progress_callback
        
        # Fail-safe setup
        pyautogui.FAILSAFE = True
        
        # Reduce default pauses for faster execution
        pyautogui.PAUSE = 0.01

    def _randomize_coordinate(self, value: int, variance: int = 2) -> int:
        """Adds a random offset to the coordinate."""
        return value + random.randint(-variance, variance)

    def _log(self, message: str):
        """Logs a message with a timestamp."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        full_message = f"[{timestamp}] {message}"
        if self.logger_callback:
            self.logger_callback(full_message)
        else:
            print(full_message)

    def _interruptible_sleep(self, duration: float):
        """Sleeps for the given duration but checks for stop_event periodically."""
        if duration <= 0:
            return
            
        end_time = time.time() + duration
        while time.time() < end_time:
            if self.stop_event and self.stop_event.is_set():
                return
            
            remaining = end_time - time.time()
            if remaining > 0:
                # Sleep for at most 0.1s, or the remaining time
                time.sleep(min(0.1, remaining))

    def _find_task_recursive(self, nodes, task_id):
        """Recursively searches for a task with the given ID in a tree of nodes."""
        for node in nodes:
            if node.get('id') == task_id:
                return node
            if node.get('children'):
                found = self._find_task_recursive(node['children'], task_id)
                if found:
                    return found
        return None

    def _make_lparam(self, x, y):
        """Creates a 32-bit integer from two 16-bit integers (x, y)."""
        return (y << 16) | (x & 0xFFFF)

    def _send_click_background(self, hwnd, x, y):
        """Sends a background click using PostMessage."""
        lparam = self._make_lparam(x, y)
        # Note: Sending WM_MOUSEMOVE can sometimes cause the window to activate or pop to front
        # depending on the application's handling. We try to avoid it for simple clicks.
        # win32gui.PostMessage(hwnd, win32con.WM_MOUSEMOVE, 0, lparam)
        # time.sleep(0.02)
        
        # Use PostMessage to avoid blocking if the application is unresponsive
        win32gui.PostMessage(hwnd, win32con.WM_LBUTTONDOWN, win32con.MK_LBUTTON, lparam)
        time.sleep(0.05) # Short delay for button press
        win32gui.PostMessage(hwnd, win32con.WM_LBUTTONUP, 0, lparam)

    def _send_mouse_down_background(self, hwnd, x, y):
        lparam = self._make_lparam(x, y)
        win32gui.PostMessage(hwnd, win32con.WM_MOUSEMOVE, win32con.MK_LBUTTON, lparam)
        win32gui.PostMessage(hwnd, win32con.WM_LBUTTONDOWN, win32con.MK_LBUTTON, lparam)

    def _send_mouse_up_background(self, hwnd, x, y):
        lparam = self._make_lparam(x, y)
        win32gui.PostMessage(hwnd, win32con.WM_MOUSEMOVE, 0, lparam)
        win32gui.PostMessage(hwnd, win32con.WM_LBUTTONUP, 0, lparam)

    def _send_key_background(self, hwnd, key, duration=0.1):
        """Sends a background key press using PostMessage."""
        # Map key string to virtual key code
        vk_code = self._get_vk_code(key)
        if not vk_code:
            self._log(f"Warning: Could not map key '{key}' to VK code.")
            return

        win32gui.PostMessage(hwnd, win32con.WM_KEYDOWN, vk_code, 0)
        time.sleep(duration)
        win32gui.PostMessage(hwnd, win32con.WM_KEYUP, vk_code, 0)

    def _get_vk_code(self, key):
        """Helper to map key strings to VK codes."""
        key = key.upper()
        # Basic mapping
        if len(key) == 1:
            return ord(key)
        
        mapping = {
            'ENTER': win32con.VK_RETURN,
            'ESC': win32con.VK_ESCAPE,
            'SPACE': win32con.VK_SPACE,
            'TAB': win32con.VK_TAB,
            'BACKSPACE': win32con.VK_BACK,
            'SHIFT': win32con.VK_SHIFT,
            'CTRL': win32con.VK_CONTROL,
            'ALT': win32con.VK_MENU,
            'UP': win32con.VK_UP,
            'DOWN': win32con.VK_DOWN,
            'LEFT': win32con.VK_LEFT,
            'RIGHT': win32con.VK_RIGHT,
            'F1': win32con.VK_F1, 'F2': win32con.VK_F2, 'F3': win32con.VK_F3, 'F4': win32con.VK_F4,
            'F5': win32con.VK_F5, 'F6': win32con.VK_F6, 'F7': win32con.VK_F7, 'F8': win32con.VK_F8,
            'F9': win32con.VK_F9, 'F10': win32con.VK_F10, 'F11': win32con.VK_F11, 'F12': win32con.VK_F12,
        }
        return mapping.get(key)

    def execute_task(self, task_name: str, actions: List[Dict[str, Any]], loop_count: int = 1, default_wait: float = 0.5, call_stack: List[str] = None):
        """Executes a specific list of actions."""
        self._log(f"DEBUG: execute_task called for '{task_name}' with {len(actions)} actions. Loop count: {loop_count}")

        if call_stack is None:
            call_stack = []
            
        current_loop = 0
        
        # Default global delay for loops within a task
        global_delay = self.settings.get('global_delay', 1.0)
        
        # Check for background mode
        background_mode = self.settings.get('background_mode', False)
        # Ensure boolean if string passed
        if isinstance(background_mode, str):
            background_mode = background_mode.lower() == 'true'

        # Check for simulate drag mode
        simulate_drag = self.settings.get('simulateDrag', False)
        if isinstance(simulate_drag, str):
            simulate_drag = simulate_drag.lower() == 'true'
            
        self._log(f"DEBUG: Background Mode is {'ON' if background_mode else 'OFF'}, Simulate Drag is {'ON' if simulate_drag else 'OFF'}")

        while True:
            if self.stop_event and self.stop_event.is_set():
                self._log(f"Task '{task_name}' stopped by user.")
                break

            if loop_count > 0 and current_loop >= loop_count:
                self._log(f"Task '{task_name}' completed {loop_count} loops.")
                break
            
            current_loop += 1
            if loop_count > 1:
                self._log(f"Task '{task_name}' - Loop {current_loop}/{loop_count}")
            else:
                self._log(f"Executing Task '{task_name}'...")

            # Ensure window is active at the start of each loop (only if NOT in background mode)
            if not background_mode:
                if not self.wm.activate_window():
                    self._log("Warning: Could not activate target window. Retrying find_window...")
                    # Force a re-find
                    self.wm.window = None
                    self.wm.target_hwnd = None
                    if not self.wm.find_window():
                         self._log("Error: Target window NOT found. Aborting task.")
                         break
                    # Try activating again
                    if not self.wm.activate_window():
                         self._log("Error: Window found but cannot be activated. Aborting task.")
                         break
                else:
                    # Small delay to ensure focus switch
                    time.sleep(0.2)
            else:
                # In background mode, just ensure we have the handle
                if not self.wm.find_window():
                    self._log("Error: Target window not found. Aborting task.")
                    break

            for idx, action in enumerate(actions):
                if self.stop_event and self.stop_event.is_set():
                    break

                if self.progress_callback and not call_stack:
                    self.progress_callback(idx)

                action_type = action.get('type', 'click')
                self._log(f"DEBUG: Processing Action {idx+1}/{len(actions)}: Type={action_type}, Data={action}")
                
                # Determine wait time
                wait_strategy = action.get('wait_strategy', 'fixed')
                if wait_strategy == 'random':
                    w_min = float(action.get('wait_min') or 0.0)
                    w_max = float(action.get('wait_max') or 0.0)
                    if w_max < w_min:
                        w_max = w_min
                    wait_after = random.uniform(w_min, w_max)
                else:
                    wait_after = float(action.get('wait_after') or default_wait)

                name = action.get('name', f"Action {idx+1}")

                if action_type == 'ref':
                    ref_id = action.get('refId')
                    self._log(f"DEBUG: Processing Ref ID: {ref_id}")
                    
                    # Search in library (which should contain both tasks and actions)
                    library = self.config.get('library', [])
                    node = self._find_task_recursive(library, ref_id)
                    
                    if node:
                        self._log(f"DEBUG: Found Ref Node: {node.get('name')} (Type: {node.get('type')})")
                        if node.get('type') == 'action':
                            # Execute atomic action
                            action_data = node.get('data', {})
                            
                            # Handle case where data is a list (recorded sequence) or dict (single action)
                            actions_list = action_data if isinstance(action_data, list) else [action_data]
                            
                            self.execute_task(node.get('name'), actions_list, loop_count=1, call_stack=call_stack)
                            
                            # Check stop event after returning from recursion
                            if self.stop_event and self.stop_event.is_set():
                                break
                        elif node.get('type') == 'task':
                            # Execute sub-task sequence
                            new_stack = call_stack + [ref_id]
                            if ref_id in call_stack:
                                self._log(f"Error: Circular dependency in Ref {ref_id}")
                                continue
                            self.execute_task(node.get('name'), node.get('sequence', []), loop_count=1, call_stack=new_stack)
                            
                            # Check stop event after returning from recursion
                            if self.stop_event and self.stop_event.is_set():
                                break
                    else:
                        self._log(f"Error: Ref Node {ref_id} not found in library.")

                elif action_type == 'run_task':
                    sub_task_id = action.get('task_id')
                    
                    # Circular dependency check
                    if sub_task_id in call_stack:
                        self._log(f"Error: Circular dependency detected! Task {sub_task_id} is already in call stack: {call_stack}. Skipping.")
                        continue
                        
                    self._log(f"Running sub-task: {name} (ID: {sub_task_id})")
                    
                    # Find the task in config (Tasks or Library)
                    tasks = self.config.get('tasks', [])
                    library = self.config.get('library', [])
                    
                    sub_task = self._find_task_recursive(tasks, sub_task_id)
                    if not sub_task:
                        sub_task = self._find_task_recursive(library, sub_task_id)
                    
                    if sub_task:
                        # Recursively execute
                        # Note: We pass loop_count=1 for the sub-task call itself, 
                        # unless we want to support loops in sub-calls (maybe later)
                        # Also pass the sub-task's default wait if it exists, or inherit current
                        sub_default_wait = sub_task.get('default_wait', default_wait)
                        
                        # Add current task to stack (we don't have current task ID here easily, 
                        # but we can track the sub_task_id being entered)
                        new_stack = call_stack + [sub_task_id]
                        
                        self.execute_task(sub_task['name'], sub_task['actions'], loop_count=1, default_wait=sub_default_wait, call_stack=new_stack)
                        
                        # Check stop event after returning from recursion
                        if self.stop_event and self.stop_event.is_set():
                            break
                    else:
                        self._log(f"Error: Sub-task with ID {sub_task_id} not found.")

                elif action_type == 'mouse_down':
                    rel_x = action.get('rel_x')
                    rel_y = action.get('rel_y')
                    if rel_x is not None and rel_y is not None:
                        if background_mode:
                            hwnd = self.wm.target_hwnd
                            if hwnd:
                                self._log(f"Background Mouse Down at ({rel_x}, {rel_y})")
                                # Visualize
                                try:
                                    screen_vis = self.wm.client_to_screen(int(rel_x), int(rel_y))
                                    if screen_vis:
                                        self.visualizer.highlight_click(screen_vis[0], screen_vis[1], duration=0.2)
                                except: pass
                                self._send_mouse_down_background(hwnd, rel_x, rel_y)
                        else:
                            try:
                                rel_x = int(rel_x)
                                rel_y = int(rel_y)
                                screen_point = self.wm.client_to_screen(rel_x, rel_y)
                                if screen_point:
                                    sx, sy = screen_point
                                    self._log(f"Mouse Down at ({sx}, {sy})")
                                    # Visualize
                                    self.visualizer.highlight_click(sx, sy, duration=0.2)
                                    # Use pyautogui for better desktop application compatibility
                                    pyautogui.moveTo(sx, sy)
                                    pyautogui.mouseDown()
                            except (ValueError, TypeError):
                                self._log(f"Error: Invalid coordinates for mouse_down: ({rel_x}, {rel_y})")

                elif action_type == 'mouse_up':
                    rel_x = action.get('rel_x')
                    rel_y = action.get('rel_y')
                    if rel_x is not None and rel_y is not None:
                        if background_mode:
                            hwnd = self.wm.target_hwnd
                            if hwnd:
                                self._log(f"Background Mouse Up at ({rel_x}, {rel_y})")
                                # Visualize
                                try:
                                    screen_vis = self.wm.client_to_screen(int(rel_x), int(rel_y))
                                    if screen_vis:
                                        self.visualizer.highlight_click(screen_vis[0], screen_vis[1], duration=0.2)
                                except: pass
                                self._send_mouse_up_background(hwnd, rel_x, rel_y)
                        else:
                            try:
                                rel_x = int(rel_x)
                                rel_y = int(rel_y)
                                screen_point = self.wm.client_to_screen(rel_x, rel_y)
                                if screen_point:
                                    sx, sy = screen_point
                                    self._log(f"Mouse Up at ({sx}, {sy})")
                                    # Visualize
                                    self.visualizer.highlight_click(sx, sy, duration=0.2)
                                    pyautogui.moveTo(sx, sy)
                                    pyautogui.mouseUp()
                            except (ValueError, TypeError):
                                self._log(f"Error: Invalid coordinates for mouse_up: ({rel_x}, {rel_y})")

                elif action_type == 'click':
                    rel_x = action.get('rel_x')
                    rel_y = action.get('rel_y')
                    
                    if rel_x is None or rel_y is None:
                        self._log(f"Skipping invalid click action at index {idx}")
                        continue

                    if background_mode:
                        # Background Click
                        hwnd = self.wm.target_hwnd
                        if hwnd:
                            self._log(f"Background Click '{name}' at ({rel_x}, {rel_y})")
                            
                            # Visualize Background Click
                            try:
                                # Convert relative to screen just for visualization
                                screen_vis = self.wm.client_to_screen(int(rel_x), int(rel_y))
                                if screen_vis:
                                    vx, vy = screen_vis
                                    self.visualizer.highlight_click(vx, vy)
                            except Exception as e:
                                self._log(f"Viz Error: {e}")

                            self._send_click_background(hwnd, rel_x, rel_y)
                        else:
                            self._log("Error: No window handle for background click.")
                    else:
                        # Foreground Click
                        # Use client_to_screen for accurate coordinates (accounting for title bar/borders)
                        # Ensure coordinates are integers
                        try:
                            rel_x = int(rel_x)
                            rel_y = int(rel_y)
                        except (ValueError, TypeError):
                             self._log(f"Error: Invalid coordinates format ({rel_x}, {rel_y}). Skipping.")
                             continue

                        abs_coords = self.wm.client_to_screen(rel_x, rel_y)
                        if not abs_coords:
                            # Fallback to absolute coordinates if client_to_screen fails
                            self._log("Warning: client_to_screen failed, falling back to window origin offset.")
                            abs_coords = self.wm.get_absolute_coordinates(rel_x, rel_y)
                        
                        if not abs_coords:
                            self._log("Error: Window not found or invalid coordinates. Skipping action.")
                            continue

                        target_x, target_y = abs_coords
                        
                        # Randomize
                        final_x = self._randomize_coordinate(target_x)
                        final_y = self._randomize_coordinate(target_y)

                        self._log(f"Clicking '{name}' at ({final_x}, {final_y})")

                        # Ensure window is active before clicking
                        if not self.wm.activate_window():
                            self._log("Warning: Could not activate window before click. Clicking anyway...")

                        # Move and Click
                        try:
                            # Visualize
                            self.visualizer.highlight_click(final_x, final_y)

                            # Use pyautogui instead of pydirectinput
                            pyautogui.moveTo(final_x, final_y)
                            time.sleep(0.05) # Wait for mouse to settle
                            pyautogui.click()
                        except pyautogui.FailSafeException:
                            self._log("Fail-safe triggered! Stopping execution.")
                            raise
                        except Exception as e:
                            self._log(f"Error during click action: {e}")

                elif action_type == 'drag':
                    start_x = action.get('start_x')
                    start_y = action.get('start_y')
                    end_x = action.get('end_x')
                    end_y = action.get('end_y')
                    duration = action.get('duration', 0.5)
                    path = action.get('path', [])

                    if start_x is None or start_y is None or end_x is None or end_y is None:
                        self._log(f"Skipping invalid drag action at index {idx}")
                        continue

                    if background_mode:
                        hwnd = self.wm.target_hwnd
                        if hwnd:
                            self._log(f"Background Drag from ({start_x}, {start_y}) to ({end_x}, {end_y})")
                            # Visualize
                            try:
                                s_vis = self.wm.client_to_screen(int(start_x), int(start_y))
                                e_vis = self.wm.client_to_screen(int(end_x), int(end_y))
                                if s_vis and e_vis:
                                    self.visualizer.highlight_drag(s_vis[0], s_vis[1], e_vis[0], e_vis[1], duration)
                            except: pass

                            self._send_mouse_down_background(hwnd, start_x, start_y)
                            time.sleep(duration)
                            self._send_mouse_up_background(hwnd, end_x, end_y)
                    else:
                        # Foreground Drag
                        # Prefer client_to_screen for accuracy if available, fallback to get_absolute_coordinates
                        # Ensure ints
                        try:
                            start_x = int(start_x)
                            start_y = int(start_y)
                            end_x = int(end_x)
                            end_y = int(end_y)
                        except (ValueError, TypeError):
                            self._log(f"Error: Invalid drag coordinates. Start:({start_x},{start_y}) End:({end_x},{end_y})")
                            continue

                        start_abs = self.wm.client_to_screen(start_x, start_y) or self.wm.get_absolute_coordinates(start_x, start_y)
                        end_abs = self.wm.client_to_screen(end_x, end_y) or self.wm.get_absolute_coordinates(end_x, end_y)
                        
                        if start_abs and end_abs:
                            sx, sy = start_abs
                            ex, ey = end_abs
                            
                            self._log(f"Dragging from ({sx}, {sy}) to ({ex}, {ey})")
                            if not self.wm.activate_window():
                                self._log("Warning: Could not activate window before drag.")

                            try:
                                # Visualize Start
                                self.visualizer.highlight_drag(sx, sy, ex, ey, duration=duration if duration > 0 else 0.5)

                                # Move to start
                                pyautogui.moveTo(sx, sy)
                                time.sleep(0.05) # Stabilize
                                pyautogui.mouseDown()
                                
                                if simulate_drag and path and len(path) > 1:
                                    # Replay recorded trajectory (Real Drag)
                                    start_time = time.time()
                                    
                                    # Iterate through path points
                                    for point in path:
                                        try:
                                            pt_rel_x = int(point.get('x'))
                                            pt_rel_y = int(point.get('y'))
                                        except (ValueError, TypeError):
                                            continue

                                        pt_t = point.get('t', 0)
                                        
                                        # Convert to absolute
                                        pt_abs = self.wm.client_to_screen(pt_rel_x, pt_rel_y)
                                        if pt_abs:
                                            pt_sx, pt_sy = pt_abs
                                            
                                            # Calculate wait time
                                            elapsed = time.time() - start_time
                                            wait_time = pt_t - elapsed
                                            
                                            if wait_time > 0:
                                                time.sleep(wait_time)
                                            
                                            pyautogui.moveTo(pt_sx, pt_sy)
                                else:
                                    # Fast Drag
                                    if duration > 0:
                                        pyautogui.moveTo(ex, ey, duration=duration)
                                    else:
                                        pyautogui.moveTo(ex, ey)

                                pyautogui.mouseUp()
                                self._log("Drag/Drop sequence completed.")
                            except Exception as e:
                                self._log(f"Error during drag action: {e}")
                                # Ensure mouse up if failed
                                pyautogui.mouseUp()


                elif action_type == 'key':
                    key = action.get('key')
                    duration = action.get('duration', 0.1) # Default duration if missing
                    
                    if not key:
                        continue
                    
                    if background_mode:
                        # Background Key
                        hwnd = self.wm.target_hwnd
                        if hwnd:
                            self._log(f"Background Key '{key}'")
                            self._send_key_background(hwnd, key, duration)
                        else:
                            self._log("Error: No window handle for background key.")
                    else:
                        # Foreground Key
                        # Ensure window is active before key press
                        if not self.wm.is_foreground():
                            self.wm.activate_window()
                            time.sleep(0.1)

                        self._log(f"Pressing key '{key}' for {duration}s")
                        try:
                            if duration > 0.15:
                                # For longer presses, use keyDown/keyUp
                                pyautogui.keyDown(key)
                                time.sleep(duration)
                                pyautogui.keyUp(key)
                            else:
                                # For short presses, just press
                                pyautogui.press(key)
                        except Exception as e:
                            self._log(f"Error during key action: {e}")

                elif action_type == 'key_down':
                    key = action.get('key')
                    if key:
                        if isinstance(key, str) and len(key) == 1:
                            key = key.lower()
                        
                        if background_mode:
                            hwnd = self.wm.target_hwnd
                            if hwnd:
                                self._log(f"Background Key Down '{key}'")
                                vk_code = self._get_vk_code(key)
                                if vk_code:
                                    win32gui.PostMessage(hwnd, win32con.WM_KEYDOWN, vk_code, 0)
                        else:
                            # Ensure window is active
                            if not self.wm.is_foreground():
                                self.wm.activate_window()
                                time.sleep(0.1)

                            self._log(f"Holding key '{key}' down")
                            try:
                                pyautogui.keyDown(key)
                            except Exception as e:
                                self._log(f"Error key_down: {e}")

                elif action_type == 'key_up':
                    key = action.get('key')
                    if key:
                        if isinstance(key, str) and len(key) == 1:
                            key = key.lower()
                        
                        if background_mode:
                            hwnd = self.wm.target_hwnd
                            if hwnd:
                                self._log(f"Background Key Up '{key}'")
                                vk_code = self._get_vk_code(key)
                                if vk_code:
                                    win32gui.PostMessage(hwnd, win32con.WM_KEYUP, vk_code, 0)
                        else:
                            # Ensure window is active
                            if not self.wm.is_foreground():
                                self.wm.activate_window()
                                time.sleep(0.1)

                            self._log(f"Releasing key '{key}'")
                            try:
                                pyautogui.keyUp(key)
                            except Exception as e:
                                self._log(f"Error key_up: {e}")

                # Wait
                self._interruptible_sleep(wait_after)

            # Delay between loops if looping
            if loop_count == 0 or current_loop < loop_count:
                self._interruptible_sleep(global_delay)

    def execute_sequence(self):
        """Legacy method for backward compatibility."""
        loop_count = self.settings.get('loop_count', 0)
        self.execute_task("Main Sequence", self.sequence, loop_count)
