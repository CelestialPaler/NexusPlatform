import os
import json
import logging
from backend.managers.base import BaseManager
from backend.rtp_analysis.core import RTPAnalyzer
from backend.rtp_analysis.handshake import parse_handshake
from backend.rtp_analysis.utils import find_main_udp_flow, find_all_udp_flows

class RtpManager(BaseManager):
    def __init__(self, base_dir):
        super().__init__(base_dir)
        self.data_dir = os.path.join(self.base_dir, 'backend', 'data', 'pcap')
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

    def list_files(self):
        """List available PCAP files."""
        try:
            files = [f for f in os.listdir(self.data_dir) if f.endswith('.pcap') or f.endswith('.pcapng')]
            return files
        except Exception as e:
            logging.error(f"Error listing files: {e}")
            return []

    def auto_detect_flow(self, filename):
        """Auto-detect all UDP flows in the given file."""
        file_path = os.path.join(self.data_dir, filename)
        if not os.path.exists(file_path):
            return {"status": "error", "message": "File not found"}
        
        try:
            flows = find_all_udp_flows(file_path)
            return {"status": "success", "flows": flows}
        except Exception as e:
            logging.error(f"Error detecting flow: {e}")
            return {"status": "error", "message": str(e)}

    def analyze(self, config):
        """Analyze the PCAP file."""
        filename = config.get('filename')
        sport = config.get('sport')
        dport = config.get('dport')

        if not filename or not sport or not dport:
            return {"status": "error", "message": "Missing parameters"}

        file_path = os.path.join(self.data_dir, filename)
        if not os.path.exists(file_path):
            return {"status": "error", "message": "File not found"}

        try:
            analyzer = RTPAnalyzer(file_path)
            if not analyzer.load_pcap():
                return {"status": "error", "message": "Failed to load PCAP"}
            
            if not analyzer.filter_flow(int(sport), int(dport)):
                return {"status": "error", "message": "No packets found for flow"}
            
            results = analyzer.analyze()
            if results is None:
                return {"status": "error", "message": "Analysis failed or no RTP data found"}

            handshake = parse_handshake(file_path)
            
            # Combine results
            return {
                "status": "success",
                "rtp": results,
                "handshake": handshake
            }
        except Exception as e:
            logging.error(f"Error analyzing RTP: {e}")
            return {"status": "error", "message": str(e)}
