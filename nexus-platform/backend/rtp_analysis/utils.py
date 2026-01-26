from scapy.all import *
from collections import Counter

def detect_packet_protocol(pkt):
    """Heuristic to detect protocol based on UDP payload."""
    if not pkt.haslayer(UDP):
        return "Unknown"
    
    payload = bytes(pkt[UDP].payload)
    if len(payload) < 2:
        return "UDP"
    
    # Check for RTP/RTCP (Version 2)
    # Byte 0: 10.. .... (Version = 2) -> 0x80 to 0xBF
    b0 = payload[0]
    version = (b0 & 0xC0) >> 6
    
    if version == 2:
        b1 = payload[1]
        # RTCP Packet Types are typically 200-213 (in the second byte)
        if 200 <= b1 <= 213:
            return "RTCP"
        
        # RTP Payload Type is in the second byte (masked with 0x7F)
        # Valid PTs are 0-127.
        # This is a weak check, but combined with Version=2, it's likely RTP.
        return "RTP"
        
    return "UDP"

def find_all_udp_flows(pcap_file):
    try:
        packets = rdpcap(pcap_file)
    except Exception as e:
        print(f"Error reading pcap: {e}")
        return []

    flows = {}
    
    for pkt in packets:
        if UDP in pkt and IP in pkt:
            flow_key = (pkt[IP].src, pkt[UDP].sport, pkt[IP].dst, pkt[UDP].dport)
            pkt_len = len(pkt)
            
            if flow_key not in flows:
                flows[flow_key] = {
                    "src_ip": flow_key[0],
                    "sport": flow_key[1],
                    "dst_ip": flow_key[2],
                    "dport": flow_key[3],
                    "packet_count": 0,
                    "total_bytes": 0,
                    "start_time": float(pkt.time),
                    "end_time": float(pkt.time),
                    "proto_scores": {"RTP": 0, "RTCP": 0, "UDP": 0}
                }
            
            flows[flow_key]["packet_count"] += 1
            flows[flow_key]["total_bytes"] += pkt_len
            flows[flow_key]["end_time"] = float(pkt.time)
            
            # Sample first 20 packets for protocol detection to save time, or check all?
            # Checking all is safer for accuracy.
            proto = detect_packet_protocol(pkt)
            flows[flow_key]["proto_scores"][proto] += 1

    result = []
    for key, stats in flows.items():
        duration = float(stats["end_time"] - stats["start_time"])
        throughput_bps = (stats["total_bytes"] * 8) / duration if duration > 0 else 0
        
        stats["duration_sec"] = duration
        stats["throughput_mbps"] = throughput_bps / 1e6
        
        # Determine final protocol
        scores = stats.pop("proto_scores")
        total = stats["packet_count"]
        if scores["RTP"] > total * 0.5:
            stats["protocol"] = "RTP"
        elif scores["RTCP"] > total * 0.5:
            stats["protocol"] = "RTCP"
        else:
            stats["protocol"] = "UDP"
            
        result.append(stats)
        
    # Sort by packet count descending
    result.sort(key=lambda x: x["packet_count"], reverse=True)
    return result

def find_main_udp_flow(pcap_file):
    # Deprecated but kept for compatibility if needed, or redirect to new logic
    flows = find_all_udp_flows(pcap_file)
    if flows:
        top = flows[0]
        return top["sport"], top["dport"]
    return None, None
