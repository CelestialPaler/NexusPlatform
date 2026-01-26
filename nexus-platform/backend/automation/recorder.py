import time
import threading
import os
import logging
from pynput import mouse, keyboard
from typing import List, Dict, Any, Optional, Callable
from .window_manager import WindowManager

class Recorder:
    def __init__(self, window_manager: WindowManager, output_dir: str, logger_callback: Optional[Callable[[str], None]] = None, drag_threshold: int = 10):
        self.wm = window_manager
        self.output_dir = output_dir
        self.logger = logger_callback
        self.drag_threshold = drag_threshold
        self.recorded_sequence: List[Dict[str, Any]] = []
        self.raw_events: List[tuple] = [] # (timestamp, type, data...)
        self.is_recording = False
        self.start_time = 0.0
        self.active_keys = {}
        self.is_mouse_down = False # Track mouse button state for dragging
        
        self.mouse_listener = None
        self.keyboard_listener = None

    def log(self, message: str):
        logging.info(message)
        if self.logger:
            self.logger(message)
        print(message)

    def start_recording(self):
        """Starts the recording hooks."""
        self.log("DEBUG: Starting recording hooks...")
        self.recorded_sequence = []
        self.raw_events = []
        self.is_recording = True
        self.start_time = time.time()

        # Ensure window is found to calculate relative coords
        if not self.wm.window:
            if self.wm.find_window():
                self.log(f"Recorder: Found window '{self.wm.window_title}'")
            else:
                self.log(f"Recorder: Could not find window '{self.wm.window_title}'")

        try:
            self.mouse_listener = mouse.Listener(on_click=self._on_click, on_move=self._on_move)
            self.keyboard_listener = keyboard.Listener(on_press=self._on_key_press, on_release=self._on_key_release)
            
            self.mouse_listener.start()
            self.keyboard_listener.start()
            self.log("Recorder: Input listeners started successfully")
        except Exception as e:
            self.log(f"Recorder: Failed to start listeners: {e}")
        
        self.log("Recorder: Hooks started")


    def stop_recording(self) -> Dict[str, Any]:
        """Stops recording and returns the sequence and metadata."""
        self.is_recording = False
        
        if self.mouse_listener:
            self.mouse_listener.stop()
        if self.keyboard_listener:
            self.keyboard_listener.stop()
            
        self.log(f"Recorder: Raw events captured: {len(self.raw_events)}")
            
        # Process raw events into sequence
        self._process_raw_events()
        
        self.log(f"Recorder: Processed sequence length: {len(self.recorded_sequence)}")
        
        return {
            "sequence": self.recorded_sequence
        }

    def _process_raw_events(self):
        """Converts raw timestamped events into action sequence with delays."""
        if not self.raw_events:
            return

        # Sort by timestamp just in case
        self.raw_events.sort(key=lambda x: x[0])
        
        processed_actions = []
        last_time = self.start_time
        
        # Helper to add action
        def add_action(action, timestamp):
            nonlocal last_time
            delay = timestamp - last_time
            
            # Insert explicit wait if delay is significant
            # Reduced threshold to 0.05 to capture faster sequences accurately
            if delay > 0.05:
                processed_actions.append({
                    "type": "wait",
                    "wait_after": round(delay, 3)
                })
            
            # Add the action itself
            # We set wait_after to 0 initially, the next action will determine the wait
            # Actually, the wait is BEFORE the action in this logic (wait, then action)
            # But our engine executes action then waits.
            # So we should attach the delay to the PREVIOUS action if possible.
            
            if processed_actions and processed_actions[-1]['type'] != 'wait':
                processed_actions[-1]['wait_after'] = round(delay, 3)
            elif processed_actions and processed_actions[-1]['type'] == 'wait':
                # If previous was wait, merge? No, just keep it.
                pass

            # For the current action, default wait is small
            action['wait_after'] = 0.01 
            processed_actions.append(action)
            last_time = timestamp

        # First pass: Convert all to atomic actions
        for event in self.raw_events:
            ts, evt_type = event[0], event[1]
            
            if evt_type in ['mouse_down', 'mouse_up', 'mouse_move']:
                cx, cy = event[2], event[3]
                # For mouse_down/up, button is at index 4, but we don't need it for atomic action dict yet
                add_action({
                    "type": evt_type,
                    "rel_x": cx,
                    "rel_y": cy
                }, ts)
            
            elif evt_type == 'key_down':
                key = event[2]
                add_action({"type": "key_down", "key": key}, ts)
                
            elif evt_type == 'key_up':
                key = event[2]
                add_action({"type": "key_up", "key": key}, ts)

        # Second pass: Merge atomic key_down/up into "key" and mouse_down/up into "click"
        final_sequence = []
        skip_indices = set()
        
        for i in range(len(processed_actions)):
            if i in skip_indices:
                continue
                
            curr = processed_actions[i]
            merged = False
            
            if curr['type'] == 'key_down':
                # Do NOT merge into atomic 'key' press. Keep as key_down/key_up to support holding keys.
                final_sequence.append(curr)
                merged = True

            elif curr['type'] == 'key_up':
                final_sequence.append(curr)
                merged = True

            elif curr['type'] == 'mouse_down':
                # Look ahead for the matching mouse_up
                found_up = False
                path_points = []
                
                for j in range(i + 1, len(processed_actions)):
                    if j in skip_indices: continue
                    
                    next_act = processed_actions[j]
                    
                    if next_act['type'] == 'mouse_move':
                        # Collect path points
                        path_points.append({
                            'x': next_act['rel_x'],
                            'y': next_act['rel_y'],
                            'ts': next_act.get('video_ts', 0)
                        })
                        skip_indices.add(j) # Consume move event
                        
                    elif next_act['type'] == 'mouse_up':
                        # Check distance (drag vs click)
                        dx = abs(curr['rel_x'] - next_act['rel_x'])
                        dy = abs(curr['rel_y'] - next_act['rel_y'])
                        
                        # If movement is within threshold, treat as a click
                        # We ignore path_points here because slight mouse jitter is common during clicks
                        if dx < self.drag_threshold and dy < self.drag_threshold: 
                            # Merge into a single 'click' action
                            wait_after = next_act['wait_after']
                            
                            final_sequence.append({
                                "type": "click",
                                "rel_x": curr['rel_x'],
                                "rel_y": curr['rel_y'],
                                "wait_after": wait_after
                            })
                            skip_indices.add(j)
                            found_up = True
                            merged = True
                            break
                        else:
                            # It's a drag!
                            wait_after = next_act['wait_after']
                            duration = next_act.get('video_ts', 0) - curr.get('video_ts', 0)
                            
                            # Normalize path timestamps to be relative to start of drag
                            start_ts = curr.get('video_ts', 0)
                            normalized_path = []
                            
                            # Add start point
                            normalized_path.append({'x': curr['rel_x'], 'y': curr['rel_y'], 't': 0})
                            
                            # Add intermediate points
                            # Downsample path if too dense?
                            # For now, keep all points but ensure relative time
                            for p in path_points:
                                normalized_path.append({
                                    'x': p['x'],
                                    'y': p['y'],
                                    't': round(p['ts'] - start_ts, 3)
                                })
                                
                            # Add end point
                            normalized_path.append({
                                'x': next_act['rel_x'],
                                'y': next_act['rel_y'],
                                't': round(duration, 3)
                            })
                            
                            final_sequence.append({
                                "type": "drag",
                                "start_x": curr['rel_x'],
                                "start_y": curr['rel_y'],
                                "end_x": next_act['rel_x'],
                                "end_y": next_act['rel_y'],
                                "duration": round(max(0.1, duration), 2),
                                "wait_after": wait_after,
                                "path": normalized_path # Store full trajectory
                            })
                            skip_indices.add(j)
                            found_up = True
                            merged = True
                            break
                
                if not found_up:
                    # Treat as click
                    final_sequence.append({
                        "type": "click",
                        "rel_x": curr['rel_x'],
                        "rel_y": curr['rel_y'],
                        "wait_after": curr['wait_after']
                    })
                    merged = True
            
            elif curr['type'] == 'mouse_up':
                # Should have been consumed by merge. If not, ignore it (it's an orphan up event)
                merged = True # Skip adding it

            elif curr['type'] == 'mouse_move':
                # Ignore orphan mouse moves that weren't consumed by drag logic
                merged = True 
            
            if not merged:
                final_sequence.append(curr)
        
        # Third pass: Merge consecutive wait actions
        merged_sequence = []
        for action in final_sequence:
            if not merged_sequence:
                merged_sequence.append(action)
                continue
                
            last = merged_sequence[-1]
            if action['type'] == 'wait' and last['type'] == 'wait':
                # Merge waits
                last['wait_after'] = round(last['wait_after'] + action['wait_after'], 3)
            else:
                merged_sequence.append(action)

        self.recorded_sequence = merged_sequence

    def _on_click(self, x, y, button, pressed):
        if not self.is_recording: return
        # logging.info(f"RAW CLICK: {x}, {y}, {button}, {pressed}") # Debug raw
        
        if button != mouse.Button.left: return
        
        # Convert to client coords
        client_point = self.wm.screen_to_client(x, y)
        if not client_point:
            self.log(f"Recorder: Click ignored (ScreenToClient failed) at {x},{y}")
            # Reset state if UP event is ignored
            if not pressed: self.is_mouse_down = False
            return
            
        cx, cy = client_point
        
        # Check bounds
        client_rect = self.wm.get_client_rect()
        if client_rect:
            _, _, w, h = client_rect
            if not (0 <= cx <= w and 0 <= cy <= h):
                self.log(f"Recorder: Click outside client area ({cx},{cy} vs {w}x{h}) - Ignoring")
                # Reset state if UP event is ignored
                if not pressed: self.is_mouse_down = False
                return
        
        # Record event
        evt_type = 'mouse_down' if pressed else 'mouse_up'
        self.is_mouse_down = pressed # Update state
        
        self.raw_events.append((time.time(), evt_type, cx, cy, button))
        self.log(f"Recorder: {evt_type} at {cx},{cy}")

    def _on_move(self, x, y):
        if not self.is_recording: return
        if not self.is_mouse_down: return # Only record moves while dragging
        
        # Convert to client coords
        client_point = self.wm.screen_to_client(x, y)
        if not client_point: return
        cx, cy = client_point
        
        # Throttle? Maybe not needed if we process later.
        # But let's avoid spamming logs
        self.raw_events.append((time.time(), 'mouse_move', cx, cy))

    def _on_key_press(self, key):
        if not self.is_recording: return
        # logging.info(f"RAW KEY PRESS: {key}") # Debug raw
        
        # Check if target window is foreground
        if not self.wm.is_foreground():
            self.log("Recorder: Key ignored (Window not foreground)")
            return

        try:
            if hasattr(key, 'char') and key.char:
                key_char = key.char.lower()
            else:
                key_char = str(key).replace('Key.', '')
        except AttributeError:
            key_char = str(key).replace('Key.', '')
        
        # Avoid auto-repeat spam?
        # pynput sends repeated press events if held.
        # We need to filter them out.
        # But we don't have active_keys state here easily if we just append.
        # Let's check if the last event for this key was a down.
        
        # Simple de-bounce: check if last event was key_down of same key
        # This is O(N) but N is small during recording usually.
        # Actually, let's just use a set for active keys
        if key_char not in self.active_keys:
            self.active_keys[key_char] = True
            self.raw_events.append((time.time(), 'key_down', key_char))
            self.log(f"Recorder: Key Down {key_char}")

    def _on_key_release(self, key):
        if not self.is_recording: return
        if key == keyboard.Key.esc: return # Don't record escape?
        
        # Check if target window is foreground (optional for release, but safer)
        if not self.wm.is_foreground():
            return

        try:
            if hasattr(key, 'char') and key.char:
                key_char = key.char.lower()
            else:
                key_char = str(key).replace('Key.', '')
        except AttributeError:
            key_char = str(key).replace('Key.', '')

        if key_char in self.active_keys:
            del self.active_keys[key_char]
            
        self.raw_events.append((time.time(), 'key_up', key_char))
        self.log(f"Recorder: Key Up {key_char}")
