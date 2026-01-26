import logging
import threading
import time
import subprocess
import platform

logger = logging.getLogger('PlaybookEngine')

class PlaybookEngine:
    def __init__(self, api):
        self.api = api
        self.registry = {} # id -> PlaybookClass
        self.running_tasks = {} # task_id -> thread

    def register(self, playbook_cls):
        """Register a playbook class"""
        pb = playbook_cls()
        pid = pb.meta.get('id')
        self.registry[pid] = pb
        logger.info(f"Registered Playbook: {pid}")

    def get_list(self):
        """Return list of available playbooks metadata"""
        return [pb.meta for pb in self.registry.values()]

    def run_playbook(self, playbook_id, args):
        """Run a playbook in a separate thread"""
        if playbook_id not in self.registry:
            raise ValueError(f"Playbook {playbook_id} not found")
        
        pb = self.registry[playbook_id]
        
        # Context object passed to playbook
        context = PlaybookContext(self.api, playbook_id)
        
        t = threading.Thread(target=self._safe_run, args=(pb, context, args))
        t.daemon = True
        t.start()
        return {"status": "started", "task_id": context.task_id}

    def _safe_run(self, pb, context, args):
        try:
            context.log(f"Started Playbook: {pb.meta['title']}")
            pb.run(context, args)
            context.log("Playbook finished successfully.", level="success")
        except Exception as e:
            context.log(f"Playbook Failed: {str(e)}", level="error")
            logger.error(f"Playbook Error: {e}")

class PlaybookContext:
    def __init__(self, api, source_id):
        self.api = api
        self.source = source_id
        self.task_id = f"{source_id}-{int(time.time())}"
        
    def log(self, message, level="info"):
        """Send log to frontend"""
        print(f"[{self.source.upper()}] {message}")
        try:
            # Emit via socketio or generic log_message if available
            self.api.log_message(level, message, source=self.source)
        except:
            pass
            
    def parallel(self):
        """Helper for parallel execution (future enhancement)"""
        pass

class BasePlaybook:
    meta = {
        "id": "base",
        "title": "Base Playbook",
        "inputs": []
    }
    def run(self, context, args):
        pass
