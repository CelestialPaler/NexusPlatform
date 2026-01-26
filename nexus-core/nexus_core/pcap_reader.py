"""
Nexus Analyzer Core - PCAP Reader
Wrapper around Scapy/DPKT for efficient packet reading.
"""
from scapy.all import rdpcap, PcapReader

class PcapEngine:
    def __init__(self, file_path):
        self.file_path = file_path

    def stream_packets(self):
        # Generator for memory-efficient reading
        with PcapReader(self.file_path) as pcap_reader:
            for pkt in pcap_reader:
                yield pkt
