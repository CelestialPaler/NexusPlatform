import logging
import json
import os
import sys
from datetime import datetime

class FrontendHandler(logging.Handler):
    """
    Custom logging handler that sends logs to the frontend via pywebview.
    """
    def __init__(self, api_instance):
        super().__init__()
        self.api = api_instance

    def emit(self, record):
        try:
            log_entry = {
                'timestamp': datetime.fromtimestamp(record.created).strftime('%H:%M:%S'),
                'level': record.levelname,
                'module': record.name,
                'message': self.format(record)
            }
            
            # We need to send this to the frontend.
            # Since we can't easily call window.evaluate_js from a random thread without context,
            # we rely on the window manager or a global event bus if available.
            # However, pywebview's evaluate_js is thread-safe.
            
            if self.api and self.api._window_manager:
                # Broadcast to all windows
                # We use a custom event 'log-entry'
                js_code = f"window.dispatchEvent(new CustomEvent('log-entry', {{ detail: {json.dumps(log_entry)} }}));"
                
                # We need to run this on the main thread or ensure thread safety.
                # pywebview handles this internally usually.
                for window in self.api._window_manager.windows:
                    try:
                        window.evaluate_js(js_code)
                    except Exception:
                        pass
        except Exception:
            self.handleError(record)

def setup_logger(api_instance=None):
    """
    Configures the root logger.
    """
    # Create logs directory
    if not os.path.exists('logs'):
        os.makedirs('logs')

    # Root logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Clear existing handlers to avoid duplicates
    if logger.hasHandlers():
        logger.handlers.clear()

    # Formatter
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    # File Handler (All logs)
    file_handler = logging.FileHandler('logs/app.log', encoding='utf-8')
    file_handler.setLevel(logging.DEBUG) # Capture everything in file
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Console Handler (Only if we have a valid stdout)
    # Check if sys.stdout is valid/open before adding StreamHandler
    # In PyInstaller --windowed mode, sys.stdout might be None or a NullWriter
    should_add_console = True
    if hasattr(sys.stdout, 'isatty'):
        # If it's a NullWriter or closed file, don't use it
        try:
           # Test writing
           if not sys.stdout.isatty() and getattr(sys, 'frozen', False):
               # In frozen windowed mode, usually no console
               should_add_console = False
        except Exception:
            should_add_console = False
    elif sys.stdout is None:
        should_add_console = False

    if should_add_console:
        try:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.INFO)
            console_handler.setFormatter(formatter)
            logger.addHandler(console_handler)
        except Exception:
            pass # Ignore if we can't create stream handler

    # Frontend Handler (if API provided)
    if api_instance:
        frontend_handler = FrontendHandler(api_instance)
        frontend_handler.setLevel(logging.INFO) # Default level for frontend
        frontend_handler.setFormatter(formatter)
        logger.addHandler(frontend_handler)

    logging.info("Logger initialized")
