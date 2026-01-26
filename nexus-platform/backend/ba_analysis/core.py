import struct
from scapy.all import rdpcap, Dot11, Dot11QoS, PcapReader
import datetime

class BaAnalyzer:
    def __init__(self, pcap_path):
        self.pcap_path = pcap_path

    def detect_flows(self):
        """
        Scan PCAP for distinct (SA, DA, TID) flows.
        Returns a list of flow dicts.
        """
        flows = {} # Key: (sa, da, tid), Value: {count, type_counts}
        
        try:
            # Use PcapReader for memory efficiency on scan
            with PcapReader(self.pcap_path) as pcap_reader:
                for packet in pcap_reader:
                    if not packet.haslayer(Dot11):
                        continue
                        
                    dot11 = packet[Dot11]
                    try:
                        type_val = dot11.type
                        subtype_val = dot11.subtype
                        addr1 = dot11.addr1 # RA (Receiver)
                        addr2 = dot11.addr2 # TA (Transmitter)
                    except AttributeError:
                        continue
                        
                    if not addr1 or not addr2:
                        continue

                    # 1. QoS Data (Type 2, Subtype 8)
                    if type_val == 2 and subtype_val == 8:
                        tid = 0
                        if packet.haslayer(Dot11QoS):
                            tid = packet[Dot11QoS].TID
                        
                        key = (addr2, addr1, tid) # SA -> DA, TID
                        if key not in flows:
                            flows[key] = {'sa': addr2, 'da': addr1, 'tid': tid, 'packets': 0, 'data_count': 0, 'ba_count': 0}
                        
                        flows[key]['packets'] += 1
                        flows[key]['data_count'] += 1

                    # 2. BlockAck (Type 1, Subtype 9)
                    elif type_val == 1 and subtype_val == 9:
                        # Payload parsing for TID
                        try:
                            payload_bytes = bytes(packet[Dot11].payload)
                            if len(payload_bytes) >= 2:
                                ba_control = struct.unpack('<H', payload_bytes[:2])[0]
                                tid = (ba_control >> 2) & 0x0F
                                
                                # Note: For BA, TA is the BA Sender (Receiver of Data), RA is BA Receiver (Sender of Data)
                                # So flow direction is RA(Data Sender) -> TA(Data Receiver) for the *Stream*
                                # But the BA packet travels TA -> RA.
                                # To group them into the *same* flow entry as Data, we must reverse the MACs for the key.
                                # Data: SA -> DA. BA: DA -> SA.
                                # Key should be (DataSender, DataReceiver, TID).
                                # Here, BA's addr1 is DataSender (RA), BA's addr2 is DataReceiver (TA).
                                key = (addr1, addr2, tid) 
                                
                                if key not in flows:
                                     flows[key] = {'sa': addr1, 'da': addr2, 'tid': tid, 'packets': 0, 'data_count': 0, 'ba_count': 0}

                                flows[key]['packets'] += 1
                                flows[key]['ba_count'] += 1
                        except Exception:
                            pass
                            
            return list(flows.values())
            
        except Exception as e:
            print(f"Error detecting flows: {e}")
            return []

    def analyze_flow(self, sa, da, tid):
        """
        Analyze specific flow for packet list and anomalies.
        """
        packets_data = []
        anomalies = []
        
        # Ensure inputs are lower case
        sa = sa.lower()
        da = da.lower()
        
        # Tracking for anomalies
        session_acked_sns = set()
        
        try:
            # We must load all packets to sort/process? Or assume they are sorted in PCAP.
            # Using rdpcap assuming file fits in memory (as per original script)
            # Or PcapReader to stream. Let's use PcapReader to be safe but we need to return a list.
            # Paginating in backend vs frontend? User asked for "list out all packets, 10 per page".
            # Usually we send all metadata to frontend and frontend paginates, unless it's huge.
            # Let's limit to say 10000 packets or stream them. For now, list all.
            
            with PcapReader(self.pcap_path) as pcap_reader:
                for i, packet in enumerate(pcap_reader):
                    meta = {
                        'id': i + 1,
                        'time': float(packet.time),
                        'time_str': datetime.datetime.fromtimestamp(float(packet.time)).strftime('%H:%M:%S.%f')[:-3],
                        'type': '',
                        'sn': None,
                        'ssn': None,
                        'bitmap': '',
                        'valid': True,
                        'anomaly': None
                    }
                    
                    if not packet.haslayer(Dot11):
                        continue
                    
                    dot11 = packet[Dot11]
                    try:
                        type_val = dot11.type
                        subtype_val = dot11.subtype
                        addr1 = dot11.addr1.lower() if dot11.addr1 else None # RA
                        addr2 = dot11.addr2.lower() if dot11.addr2 else None # TA
                    except AttributeError:
                        continue
                        
                    # Filter: Match Data direction (SA->DA) or BA direction (DA->SA) and TID
                    is_data = (addr2 == sa and addr1 == da)
                    is_ba = (addr2 == da and addr1 == sa) # BA response comes from DataDst -> DataSrc
                    
                    if not (is_data or is_ba):
                        continue

                    # 1. QoS Data analysis
                    if type_val == 2 and subtype_val == 8 and is_data:
                        pkt_tid = -1
                        if packet.haslayer(Dot11QoS):
                            pkt_tid = packet[Dot11QoS].TID
                        
                        if pkt_tid != tid:
                            continue
                            
                        # Extract Sequence
                        sc = dot11.SC
                        if sc is not None:
                            seq_num = (sc >> 4)
                        else:
                            seq_num = -1
                        
                        fc = dot11.FCfield
                        retry = 1 if (fc & 0x08) else 0
                        
                        amenity_len = len(packet[Dot11].payload) # Rough data size
                        
                        meta.update({
                            'type': 'QoS-Data',
                            'sa': addr2,
                            'da': addr1,
                            'tid': pkt_tid,
                            'sn': seq_num,
                            'retry': bool(retry),
                            'len': amenity_len
                        })
                        packets_data.append(meta)

                    # 2. BlockAck analysis
                    elif type_val == 1 and subtype_val == 9 and is_ba:
                        payload_bytes = bytes(packet[Dot11].payload)
                        if len(payload_bytes) >= 12:
                            ba_control, ba_ssc, bitmap_int = struct.unpack('<HHQ', payload_bytes[:12])
                            pkt_tid = (ba_control >> 2) & 0x0F
                            
                            if pkt_tid != tid:
                                continue
                                
                            ssn = (ba_ssc >> 4) & 0x0FFF
                            
                            meta.update({
                                'type': 'BlockAck',
                                'sa': addr2, # BA Sender (Data Dst)
                                'da': addr1, # BA Receiver (Data Src)
                                'tid': pkt_tid,
                                'ssn': ssn,
                                'bitmap': self._format_bitmap(bitmap_int),
                                'raw_bitmap': bitmap_int
                            })
                            
                            # check consistency
                            anomaly_msg = self._check_anomaly(ssn, bitmap_int, session_acked_sns)
                            if anomaly_msg:
                                meta['anomaly'] = anomaly_msg
                                meta['valid'] = False
                                anomalies.append(meta) # Store ref
                                
                            packets_data.append(meta)

            return {
                "packets": packets_data,
                "anomalies": len(anomalies)
            }

        except Exception as e:
            print(f"Error analyzing flow: {e}")
            return {"error": str(e)}

    def _format_bitmap(self, bitmap_int):
        bits = []
        for i in range(64):
            bit_val = (bitmap_int >> i) & 1
            if i > 0 and i % 8 == 0:
                bits.append(' ')
            bits.append('1' if bit_val else '.')
        return "".join(bits)

    def _check_anomaly(self, ssn, bitmap_int, acked_set):
        found_issue = None
        current_acked = []
        
        for i in range(64):
            current_sn = (ssn + i) % 4096
            is_acked = (bitmap_int >> i) & 1
            
            if is_acked:
                acked_set.add(current_sn)
            else:
                if current_sn in acked_set:
                    # Regression detected!
                    if found_issue is None:
                        found_issue = f"SN={current_sn} was ACKed, now missing (Bit {i} in SSN={ssn})"
                    
                    # Remove from set to prevent spamming for same packet?
                    # Or keep it to show it's persistently failing? 
                    # Logic from original script: remove it.
                    acked_set.remove(current_sn)
        
        return found_issue

if __name__ == '__main__':
    # Test
    pass
