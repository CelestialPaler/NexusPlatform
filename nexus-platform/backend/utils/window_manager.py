import queue
import threading
import time
import logging

import json

class WindowManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WindowManager, cls).__new__(cls)
            cls._instance.windows = set()
            cls._instance.msg_queue = queue.Queue()
            cls._instance._start_msg_loop()
        return cls._instance

    def add_window(self, window):
        self.windows.add(window)
        # Remove window from set when closed
        window.events.closed += lambda: self.remove_window(window)

    def remove_window(self, window):
        if window in self.windows:
            self.windows.remove(window)

    def set_window(self, window):
        # Backward compatibility
        self.add_window(window)

    def send_message(self, message):
        """
        Send a message to the frontend.
        message should be a dict: {'type': 'event-name', 'detail': {...}}
        """
        self.msg_queue.put(message)

    def _start_msg_loop(self):
        def loop():
            batch = []
            last_send = time.time()
            while True:
                try:
                    # Try to get a message without blocking for long
                    msg = self.msg_queue.get(timeout=0.05)
                    batch.append(msg)
                    self.msg_queue.task_done()
                except queue.Empty:
                    pass
                except Exception as e:
                    logging.error(f"Error getting from queue: {e}")

                current_time = time.time()
                # Send if we have messages and (enough time passed OR we have a lot of messages)
                # Increased batch size and interval to reduce IPC calls
                if batch and (current_time - last_send > 0.1 or len(batch) >= 50):
                    if self.windows:
                        try:
                            # Send batch as JSON to a single JS function
                            json_data = json.dumps(batch)
                            code = f"window.processEvents({json_data})"
                            
                            # Broadcast to all active windows
                            for window in list(self.windows):
                                try:
                                    window.evaluate_js(code)
                                except RecursionError:
                                    logging.error("RecursionError in evaluate_js")
                                except Exception as e:
                                    logging.error(f"Error evaluating JS in window: {e}")
                        except Exception as e:
                            logging.error(f"Error preparing batch: {e}")
                    
                    batch = []
                    last_send = current_time
                
                # Small sleep to prevent CPU spinning
                if not batch:
                    time.sleep(0.02)
        
        t = threading.Thread(target=loop, daemon=True)
        t.start()
