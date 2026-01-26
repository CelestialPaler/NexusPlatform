from scapy.all import *
import sys
import os
from collections import Counter
import json

class RTPAnalyzer:
    def __init__(self, pcap_file):
        self.pcap_file = pcap_file
        self.packets = None
        self.target_packets = []
        self.analysis_results = {}
        self.raw_data = {}

    def load_pcap(self):
        print(f"Reading {self.pcap_file}...")
        try:
            self.packets = rdpcap(self.pcap_file)
            return True
        except FileNotFoundError:
            print(f"Error: File {self.pcap_file} not found.")
            return False
        except Exception as e:
            print(f"Error reading pcap: {e}")
            return False

    def filter_flow(self, src_port, dst_port):
        print(f"Filtering for flow {src_port} -> {dst_port}...")
        if not self.packets:
            return False
            
        self.target_packets = []
        for pkt in self.packets:
            if UDP in pkt and pkt[UDP].sport == src_port and pkt[UDP].dport == dst_port:
                self.target_packets.append(pkt)
        
        if not self.target_packets:
            print("No packets found for the specified flow.")
            return False
            
        print(f"Found {len(self.target_packets)} packets.")
        return True

    def analyze(self):
        if not self.target_packets:
            return None

        seq_numbers = []
        timestamps = []
        packet_sizes = []
        marker_bits = []
        rtp_timestamps = []
        ssrcs = []
        nal_types = []

        # Extract RTP Data
        for pkt in self.target_packets:
            if Raw in pkt:
                payload = pkt[Raw].load
                if len(payload) >= 12: # Min RTP header size
                    # Extract Sequence Number (Big Endian)
                    seq = (payload[2] << 8) | payload[3]
                    seq_numbers.append(seq)
                    timestamps.append(float(pkt.time))
                    packet_sizes.append(len(payload))
                    
                    # Extract Marker Bit
                    marker = (payload[1] & 0x80) >> 7
                    marker_bits.append(marker)
                    
                    # Extract RTP Timestamp (Big Endian)
                    rtp_ts = (payload[4] << 24) | (payload[5] << 16) | (payload[6] << 8) | payload[7]
                    rtp_timestamps.append(rtp_ts)
                    
                    # Extract SSRC
                    ssrc = (payload[8] << 24) | (payload[9] << 16) | (payload[10] << 8) | payload[11]
                    ssrcs.append(ssrc)
                    
                    # Extract NAL Type (H.264)
                    # RTP Header is 12 bytes (usually, assuming no CSRC or extensions for simplicity)
                    # TODO: Handle CSRC count (CC) and Extension bit (X) for robust parsing
                    # CC is low 4 bits of byte 0. Extension is bit 4 of byte 0.
                    v_p_x_cc = payload[0]
                    cc = v_p_x_cc & 0x0F
                    x = (v_p_x_cc & 0x10) >> 4
                    header_len = 12 + (cc * 4)
                    
                    if x:
                        # If extension bit is set, we need to skip extension header
                        # Extension header: [Profile:2][Length:2][HeaderData...]
                        if len(payload) >= header_len + 4:
                            ext_len = (payload[header_len+2] << 8) | payload[header_len+3]
                            header_len += 4 + (ext_len * 4)
                    
                    # Extract PT
                    pt = payload[1] & 0x7F
                    
                    found_types = set()
                    if len(payload) > header_len:
                        rtp_payload = payload[header_len:]
                        
                        # Scan for H.264 Start Codes (00 00 01) in the payload
                        # This handles both raw H.264 (if any) and MPEG-TS (by scanning through TS/PES headers)
                        cursor = 0
                        pl_len = len(rtp_payload)
                        while cursor < pl_len - 3:
                            idx = rtp_payload.find(b'\x00\x00\x01', cursor)
                            if idx == -1:
                                break
                            
                            if idx + 3 < pl_len:
                                nal_header = rtp_payload[idx+3]
                                n_type = nal_header & 0x1F
                                if n_type > 0: # Filter out 0
                                    found_types.add(n_type)
                            
                            cursor = idx + 3
                    
                    nal_types.append(list(found_types))

        if not seq_numbers:
            print("Could not extract sequence numbers. Is this RTP?")
            return None

        # SSRC Check
        unique_ssrcs = sorted(list(set(ssrcs)))
        
        # Loss and Reordering
        unwrapped_seq = self._unwrap_sequence_numbers(seq_numbers)
        unique_seq = sorted(list(set(unwrapped_seq)))
        
        total_expected = unique_seq[-1] - unique_seq[0] + 1
        received_unique = len(unique_seq)
        loss_count = total_expected - received_unique
        loss_rate = (loss_count / total_expected * 100) if total_expected > 0 else 0
        
        reorder_events = self._count_reordering(unwrapped_seq)

        # Throughput
        duration = timestamps[-1] - timestamps[0]
        total_bytes = sum(packet_sizes)
        throughput_bps = (total_bytes * 8) / duration if duration > 0 else 0

        # Packet IAT
        iats = [timestamps[i] - timestamps[i-1] for i in range(1, len(timestamps))]
        avg_iat = sum(iats) / len(iats) if iats else 0
        
        # Frame Analysis
        frames = self._analyze_frames(timestamps, packet_sizes, marker_bits, rtp_timestamps, nal_types)
        
        # Store raw data for plotting
        self.raw_data = {
            "timestamps": timestamps,
            "packet_sizes": packet_sizes,
            "iats": iats,
            "frames": frames
        }

        self.analysis_results = {
            "basic_stats": {
                "total_packets": len(self.target_packets),
                "duration_sec": duration,
                "throughput_mbps": throughput_bps / 1e6,
                "ssrcs": unique_ssrcs
            },
            "loss_stats": {
                "seq_range": [min(seq_numbers), max(seq_numbers)],
                "packets_lost": loss_count,
                "loss_rate_percent": loss_rate,
                "reordered_packets": reorder_events
            },
            "packet_iat_stats": {
                "avg_ms": avg_iat * 1000,
                "min_ms": min(iats) * 1000 if iats else 0,
                "max_ms": max(iats) * 1000 if iats else 0,
                "large_gaps_count": len([x for x in iats if x > 0.05])
            },
            "frame_stats": frames
        }
        
        return self.analysis_results

    def _unwrap_sequence_numbers(self, seq_numbers):
        unwrapped_seq = []
        wrap_offset = 0
        last_seq = seq_numbers[0]
        
        for seq in seq_numbers:
            if seq < last_seq - 30000:
                wrap_offset += 65536
            elif last_seq < seq - 30000:
                 wrap_offset -= 65536
            unwrapped_seq.append(seq + wrap_offset)
            last_seq = seq
        return unwrapped_seq

    def _count_reordering(self, unwrapped_seq):
        max_seen = -1
        reorder_events = 0
        for seq in unwrapped_seq:
            if seq < max_seen:
                reorder_events += 1
            else:
                max_seen = seq
        return reorder_events

    def _analyze_frames(self, timestamps, packet_sizes, marker_bits, rtp_timestamps, nal_types):
        frames = []
        current_frame_packets = []
        current_frame_start_time = 0
        current_frame_rtp_ts = 0
        current_frame_nal_types = set()
        
        for i in range(len(marker_bits)):
            if not current_frame_packets:
                current_frame_start_time = timestamps[i]
                current_frame_rtp_ts = rtp_timestamps[i]
                current_frame_nal_types = set()
                
            current_frame_packets.append(packet_sizes[i])
            if nal_types[i]:
                current_frame_nal_types.update(nal_types[i])
            
            if marker_bits[i] == 1:
                frame_end_time = timestamps[i]
                frame_size = sum(current_frame_packets)
                frame_duration = frame_end_time - current_frame_start_time
                
                # Determine Frame Type based on NAL Types
                # 5 = IDR (I-Frame)
                # 1 = Non-IDR (P-Frame)
                # 7 = SPS, 8 = PPS
                
                f_type = 'P' # Default to P
                if 5 in current_frame_nal_types:
                    f_type = 'I'
                elif 1 not in current_frame_nal_types and (7 in current_frame_nal_types or 8 in current_frame_nal_types):
                    f_type = 'SPS/PPS' # Just config frames
                elif 1 not in current_frame_nal_types:
                    f_type = 'Other' # Audio or unknown
                
                frames.append({
                    'size': frame_size,
                    'end_time': frame_end_time,
                    'duration': frame_duration,
                    'packets': len(current_frame_packets),
                    'rtp_ts': current_frame_rtp_ts,
                    'type': f_type,
                    'nal_types': list(current_frame_nal_types)
                })
                current_frame_packets = []
        
        if not frames:
            return None

        frame_sizes = [f['size'] for f in frames]
        avg_size = sum(frame_sizes) / len(frame_sizes) if frame_sizes else 0
        
        frame_iats = []
        rtp_diffs = []
        
        for i in range(1, len(frames)):
            f_iat = frames[i]['end_time'] - frames[i-1]['end_time']
            frame_iats.append(f_iat)
            rtp_diff = frames[i]['rtp_ts'] - frames[i-1]['rtp_ts']
            rtp_diffs.append(rtp_diff)

        avg_f_iat = sum(frame_iats) / len(frame_iats) if frame_iats else 0
        estimated_fps = (1/avg_f_iat) if avg_f_iat > 0 else 0
        
        # Dynamic threshold: 2 * average interval (approx 2 frames duration)
        gap_threshold_ms = (avg_f_iat * 2 * 1000) if avg_f_iat > 0 else 33.0
        
        large_gaps = [
            {"frame_index": i, "gap_ms": f_iat * 1000, "rtp_diff": rtp_diffs[i]}
            for i, f_iat in enumerate(frame_iats) if (f_iat * 1000) > gap_threshold_ms
        ]
        
        large_gaps_count = len(large_gaps)
        total_intervals = len(frame_iats)
        large_gaps_pct = (large_gaps_count / total_intervals * 100) if total_intervals > 0 else 0
        
        return {
            "raw_frames_list": frames,
            "total_frames": len(frames),
            "avg_frame_size_bytes": avg_size,
            "iat_stats": {
                "avg_ms": avg_f_iat * 1000,
                "fps": estimated_fps,
                "min_ms": min(frame_iats) * 1000 if frame_iats else 0,
                "max_ms": max(frame_iats) * 1000 if frame_iats else 0
            },
            "rtp_diff_stats": {
                "small_diffs_count": len([d for d in rtp_diffs if d < 500]),
                "large_diffs_count": len([d for d in rtp_diffs if d >= 2000]),
                "avg_large_diff": sum([d for d in rtp_diffs if d >= 2000])/len([d for d in rtp_diffs if d >= 2000]) if [d for d in rtp_diffs if d >= 2000] else 0
            },
            "gap_analysis": {
                "threshold_ms": gap_threshold_ms,
                "count": large_gaps_count,
                "percentage": large_gaps_pct,
                "details": large_gaps
            }
        }
