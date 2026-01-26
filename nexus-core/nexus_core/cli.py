"""
Nexus Analyzer Core - CLI Entry Point
"""
import argparse
import sys
from .engine import PluginDispatcher

def main():
    parser = argparse.ArgumentParser(description="Nexus Analyzer Core CLI")
    parser.add_argument("command", choices=["analyze", "list-plugins"], help="Command to execute")
    parser.add_argument("--plugin", help="Plugin identifier (e.g., wifi.qos)")
    parser.add_argument("--input", help="Path to input file (e.g., capture.pcap)")
    parser.add_argument("--output", help="Path to output directory")
    parser.add_argument("--params", help="JSON string of parameters")
    
    args = parser.parse_args()
    
    if args.command == "list-plugins":
        print("Available plugins: (TODO)")
        return

    if args.command == "analyze":
        if not args.plugin or not args.input or not args.output:
            print("Error: --plugin, --input, and --output are required for 'analyze'")
            sys.exit(1)
            
        dispatcher = PluginDispatcher()
        dispatcher.run_plugin(args.plugin, args.input, args.output, args.params)

if __name__ == "__main__":
    main()
