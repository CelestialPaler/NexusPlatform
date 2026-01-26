# Nexus Analyzer Core

Nexus Platform 的核心分析引擎，提供 Python CLI 工具链。

## 架构
详情请参考 [00-架构设计与规划.md](00-架构设计与规划.md)。

## 安装
```bash
pip install -e .
```

## 使用
```bash
nexus-core analyze --plugin wifi.qos --input capture.pcap --output ./results
```
