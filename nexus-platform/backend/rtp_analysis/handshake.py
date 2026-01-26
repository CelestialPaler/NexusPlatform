from scapy.all import *

def parse_handshake(pcap_file):
    try:
        packets = rdpcap(pcap_file)
    except Exception as e:
        return []

    conversation = []
    cseq_map = {} # Map CSeq to Method (for responses)
    
    for i, pkt in enumerate(packets):
        if TCP in pkt and Raw in pkt:
            payload = pkt[Raw].load
            
            # Basic RTSP detection
            if b'RTSP' in payload:
                src = pkt[IP].src
                dst = pkt[IP].dst
                
                try:
                    text = payload.decode('utf-8', errors='ignore')
                except:
                    text = str(payload)
                
                lines = text.split('\r\n')
                request_line = lines[0]
                
                headers = {}
                body = ""
                is_body = False
                
                for line in lines[1:]:
                    if not line.strip():
                        is_body = True
                        continue
                    
                    if is_body:
                        body += line + "\n"
                    elif ':' in line:
                        k, v = line.split(':', 1)
                        headers[k.strip()] = v.strip()
                
                # Parse Request Line
                msg_type = "unknown"
                method = ""
                uri = ""
                status = ""
                
                parts = request_line.split(' ')
                if len(parts) >= 2:
                    if parts[0].startswith('RTSP/'):
                        msg_type = "response"
                        status = " ".join(parts[1:]) # e.g. "200 OK"
                        
                        # Try to find original method via CSeq
                        cseq = headers.get('CSeq')
                        if cseq and cseq in cseq_map:
                            method = cseq_map[cseq]
                        else:
                            method = "RESPONSE"
                            
                    else:
                        msg_type = "request"
                        method = parts[0]
                        uri = parts[1] if len(parts) > 1 else ""
                        
                        # Store CSeq
                        cseq = headers.get('CSeq')
                        if cseq:
                            cseq_map[cseq] = method
                
                conversation.append({
                    "index": i + 1,
                    "timestamp": float(pkt.time),
                    "src": src,
                    "dst": dst,
                    "type": msg_type,
                    "method": method,
                    "uri": uri,
                    "status": status,
                    "headers": headers,
                    "body": body,
                    "raw": text
                })
                
    return conversation
