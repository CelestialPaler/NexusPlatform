import os
import logging
from backend.managers.base import BaseManager
from backend.ba_analysis.core import BaAnalyzer

class BaManager(BaseManager):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self.data_dir = os.path.join(self.base_dir, 'backend', 'data', 'pcap')
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

    def auto_detect_ba_flows(self, filename):
        """Auto-detect all BA/QoS flows in the given file."""
        # Check if filename is an absolute path or just a name
        if os.path.isabs(filename) and os.path.exists(filename):
            file_path = filename
        else:
            file_path = os.path.join(self.data_dir, filename)

        if not os.path.exists(file_path):
            return {"status": "error", "message": f"File not found: {file_path}"}
        
        try:
            analyzer = BaAnalyzer(file_path)
            flows = analyzer.detect_flows()
            return {"status": "success", "flows": flows, "full_path": file_path} # Return full path for next step
        except Exception as e:
            logging.error(f"Error detecting BA flows: {e}")
            return {"status": "error", "message": str(e)}

    def analyze_ba(self, filename, sa, da, tid):
        """Analyze a specific BA flow."""
        # Check if filename is an absolute path or just a name
        if os.path.isabs(filename) and os.path.exists(filename):
            file_path = filename
        else:
            file_path = os.path.join(self.data_dir, filename)

        if not os.path.exists(file_path):
            return {"status": "error", "message": "File not found"}

        try:
            analyzer = BaAnalyzer(file_path)
            # tid comes as str or int, ensure int
            results = analyzer.analyze_flow(sa, da, int(tid))
            
            if "error" in results:
                return {"status": "error", "message": results["error"]}

            return {
                "status": "success",
                "data": results["packets"],
                "anomaly_count": results["anomalies"]
            }
        except Exception as e:
            logging.error(f"Error analyzing BA: {e}")
            return {"status": "error", "message": str(e)}
