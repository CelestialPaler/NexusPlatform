import os
import sys
import unittest
import shutil
from scapy.all import Ether, Dot11, Dot11QoS, RadioTap, wrpcap
import struct

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.managers.ba import BaManager

class TestBaManager(unittest.TestCase):
    def setUp(self):
        self.test_dir = os.path.join(os.path.dirname(__file__), 'temp_data')
        self.pcap_path = os.path.join(self.test_dir, 'test_ba.pcap')
        
        # Create dummy manager
        # We mock base_dir structure: base_dir/backend/data/pcap
        self.mock_base_dir = self.test_dir
        os.makedirs(os.path.join(self.mock_base_dir, 'backend', 'data', 'pcap'), exist_ok=True)
        
        self.manager = BaManager(self.mock_base_dir)
        self.generate_pcap()

    def generate_pcap(self):
        """Generate a synthetic PCAP with QoS and BA frames."""
        pkts = []
        
        # MACs
        sta = "00:11:22:33:44:55" # SA
        ap = "AA:BB:CC:DD:EE:FF"  # DA
        tid = 1 # TID: 1 (Background)
        
        # 1. QoS Data: STA -> AP, SN=10
        dot11 = Dot11(type=2, subtype=8, addr1=ap, addr2=sta, addr3=ap)
        qos = Dot11QoS(TID=tid)
        dot11.SC = (10 << 4) # SN=10, FN=0
        pkts.append(RadioTap()/dot11/qos/"Payload")
        
        # 2. BlockAck: AP -> STA, SSN=10, Bitmap=1 (ACKs SN 10)
        # Type 1 (Control), Subtype 9 (BlockAck)
        # addr1=STA (RA), addr2=AP (TA)
        ba_dot11 = Dot11(type=1, subtype=9, addr1=sta, addr2=ap)
        # BA Control (2 bytes) + BA SSC (2 bytes) + Bitmap (8 bytes)
        # BA Control: ACK Policy(1) + TID(1) -> TID starts at bit 2
        # TID 1 << 2 = 4. 
        ba_control = (tid << 2) | 0 # Compressed Bitmap
        # BA SSC: SSN starts at bit 4. SSN=10 << 4 = 160
        ba_ssc = (10 << 4)
        bitmap = 1 # Bit 0 is set, meaning SSN (10) is ACKed
        
        payload = struct.pack('<HHQ', ba_control, ba_ssc, bitmap)
        pkts.append(RadioTap()/ba_dot11/payload)
        
        # Write
        wrpcap(self.pcap_path, pkts)

    def tearDown(self):
        try:
            shutil.rmtree(self.test_dir)
        except:
            pass

    def test_auto_detect(self):
        print(f"Testing detection on {self.pcap_path}")
        result = self.manager.auto_detect_ba_flows(self.pcap_path)
        print("Detection Result:", result)
        
        self.assertEqual(result['status'], 'success')
        self.assertEqual(len(result['flows']), 1)
        
        flow = result['flows'][0]
        self.assertEqual(flow['sa'], "00:11:22:33:44:55")
        self.assertEqual(flow['da'], "aa:bb:cc:dd:ee:ff")
        self.assertEqual(flow['tid'], 1)
        self.assertEqual(flow['data_count'], 1)
        self.assertEqual(flow['ba_count'], 1)

    def test_analyze_flow(self):
        sa = "00:11:22:33:44:55"
        da = "AA:BB:CC:DD:EE:FF"
        tid = 1
        
        result = self.manager.analyze_ba(self.pcap_path, sa, da, tid)
        # print("Analysis Result:", result)
        
        self.assertEqual(result['status'], 'success')
        data = result['data']
        self.assertEqual(len(data), 2)
        
        # Check first packet (QoS Data)
        self.assertEqual(data[0]['type'], 'QoS-Data')
        self.assertEqual(data[0]['sn'], 10)
        
        # Check second packet (BlockAck)
        self.assertEqual(data[1]['type'], 'BlockAck')
        self.assertEqual(data[1]['ssn'], 10)
        self.assertTrue(data[1]['bitmap'].startswith('1'))

if __name__ == '__main__':
    unittest.main()
